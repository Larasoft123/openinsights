import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { suggestThemesSchema, SuggestedTheme } from '@/lib/validations';
import { clusterUnassignedHighlights } from '@/lib/services/clustering.service';
import { getGeneralAIProvider, type AIProvider } from '@/lib/ai';
import {
  buildThemeNamingPrompt,
  extractProjectContext,
  type ProjectContext,
} from '@/lib/ai/prompt-builder';
import { requireTenantAuth } from '@/lib/api/auth';
import { handleAPIError } from '@/lib/api/error-handler';
import { verifyProjectAccessTenant, getProjectById } from '@/lib/db/tenant-queries';
import { getOrganizationAIConfig } from '@/lib/services/organization-settings.service';

const log = logger.child({ route: 'themes/suggest' });

// Theme colors (same as create-theme-dialog)
const THEME_COLORS = [
  '#6366F1', // Indigo
  '#8B5CF6', // Violet
  '#EC4899', // Pink
  '#EF4444', // Red
  '#F97316', // Orange
  '#EAB308', // Yellow
  '#22C55E', // Green
  '#14B8A6', // Teal
  '#3B82F6', // Blue
];

interface ThemeNamingResult {
  name: string;
  description: string | null;
}

async function generateThemeName(
  highlights: string[],
  fallbackIndex: number,
  projectContext: ProjectContext,
  provider: AIProvider,
  userGuidelines?: string | null
): Promise<ThemeNamingResult> {
  const fallback = { name: `Theme ${fallbackIndex + 1}`, description: null };

  try {
    if (!provider.generateText) {
      log.warn('Provider does not support generateText, using fallback');
      return fallback;
    }

    const prompt = buildThemeNamingPrompt({ highlights }, projectContext, userGuidelines);
    const response = await provider.generateText(prompt, { maxTokens: 100, temperature: 0.7 });

    // Clean up response (remove markdown if present)
    let jsonText = response.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.slice(7);
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.slice(3);
    }
    if (jsonText.endsWith('```')) {
      jsonText = jsonText.slice(0, -3);
    }
    jsonText = jsonText.trim();

    const parsed = JSON.parse(jsonText) as { name?: string; description?: string };

    return {
      name: parsed.name || fallback.name,
      description: parsed.description || null,
    };
  } catch (error) {
    log.warn({ error, fallbackIndex }, 'LLM theme naming failed, using fallback');
    return fallback;
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { schemaName, workspaceId, organizationId } = await requireTenantAuth();
    const { projectId } = await params;

    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace assigned' }, { status: 403 });
    }

    // Verify project access
    const projectAccess = await verifyProjectAccessTenant(schemaName, projectId, workspaceId);
    if (!projectAccess) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Get organization AI config for provider
    const orgConfig = await getOrganizationAIConfig(organizationId);
    if (!orgConfig) {
      return NextResponse.json({ error: 'Organization configuration not found' }, { status: 500 });
    }

    // Get general AI provider for theme naming
    const provider = getGeneralAIProvider(orgConfig);

    // Fetch full project for context and custom guidelines
    const project = await getProjectById(schemaName, projectId);
    const projectContext = extractProjectContext(project);
    const userGuidelines = project?.themeNamingPrompt;

    if (userGuidelines) {
      log.debug('Using custom theme naming guidelines from project settings');
    }
    if (projectContext.goals || projectContext.researchQuestions) {
      log.debug('Including project context in theme naming prompts');
    }

    // Parse and validate request body
    const body = await request.json().catch(() => ({}));
    const parseResult = suggestThemesSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { minClusters, maxClusters } = parseResult.data;

    log.info({ projectId, minClusters, maxClusters }, 'Starting theme suggestion');

    // Perform clustering
    let clusterResult;
    try {
      clusterResult = await clusterUnassignedHighlights(schemaName, projectId, {
        minClusters,
        maxClusters,
      });
    } catch (error) {
      if (error instanceof Error) {
        // Handle known errors (e.g., "Need at least 3 unassigned highlights")
        if (error.message.includes('at least') || error.message.includes('No embeddings')) {
          return NextResponse.json({ error: error.message }, { status: 400 });
        }
      }
      throw error;
    }

    // Generate theme names using LLM (in parallel for speed)
    const themePromises = clusterResult.clusters.map((cluster, index) =>
      generateThemeName(
        cluster.representativeContent,
        index,
        projectContext,
        provider,
        userGuidelines
      ).then((naming) => ({
        ...naming,
        color: THEME_COLORS[index % THEME_COLORS.length],
        highlightIds: cluster.highlightIds,
        confidence: clusterResult.silhouetteScore,
      }))
    );

    const themes: SuggestedTheme[] = await Promise.all(themePromises);

    const totalHighlights = themes.reduce((sum, t) => sum + t.highlightIds.length, 0);

    log.info(
      {
        projectId,
        themeCount: themes.length,
        totalHighlights,
        silhouetteScore: clusterResult.silhouetteScore,
      },
      'Theme suggestion complete'
    );

    return NextResponse.json({
      themes,
      totalHighlights,
    });
  } catch (error) {
    return handleAPIError(error, 'Failed to suggest themes');
  }
}
