import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { suggestThemesSchema, SuggestedTheme } from '@/lib/validations';
import { clusterUnassignedHighlights } from '@/lib/services/clustering.service';
import { getProvider } from '@/lib/ai';
import { requireTenantAuth } from '@/lib/api/auth';
import { handleAPIError } from '@/lib/api/error-handler';
import { verifyProjectAccessTenant, getProjectById } from '@/lib/db/tenant-queries';

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

/**
 * Default theme naming prompt template.
 * Variable: {{HIGHLIGHTS}}
 */
export const DEFAULT_THEME_NAMING_PROMPT = `You are a qualitative research assistant. Based on these highlight quotes from user research interviews, suggest a concise theme name and brief description.

Highlights:
{{HIGHLIGHTS}}

Respond ONLY with valid JSON in this exact format (no markdown, no explanation):
{"name": "Short theme name (2-4 words)", "description": "One sentence describing what this theme captures"}

Focus on the common pattern or insight across these quotes. Be specific and research-oriented.`;

/**
 * Build theme naming prompt using custom template or default
 */
function buildThemeNamingPrompt(
  highlights: string[],
  customPromptTemplate?: string | null
): string {
  const highlightsList = highlights
    .slice(0, 5)
    .map((h, i) => `${i + 1}. "${h}"`)
    .join('\n');

  // Use custom prompt if provided, otherwise use default
  const template = customPromptTemplate || DEFAULT_THEME_NAMING_PROMPT;

  // Replace template variables
  return template.replace(/\{\{HIGHLIGHTS\}\}/g, highlightsList);
}

interface ThemeNamingResult {
  name: string;
  description: string | null;
}

async function generateThemeName(
  highlights: string[],
  fallbackIndex: number,
  customPromptTemplate?: string | null
): Promise<ThemeNamingResult> {
  const fallback = { name: `Theme ${fallbackIndex + 1}`, description: null };

  try {
    const provider = getProvider();

    if (!provider.generateText) {
      log.warn('Provider does not support generateText, using fallback');
      return fallback;
    }

    const prompt = buildThemeNamingPrompt(highlights, customPromptTemplate);
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
    const { schemaName, workspaceId } = await requireTenantAuth();
    const { projectId } = await params;

    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace assigned' }, { status: 403 });
    }

    // Verify project access
    const projectAccess = await verifyProjectAccessTenant(schemaName, projectId, workspaceId);
    if (!projectAccess) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Fetch full project with custom prompts
    const project = await getProjectById(schemaName, projectId);
    const customThemeNamingPrompt = project?.themeNamingPrompt;
    if (customThemeNamingPrompt) {
      log.debug('Using custom theme naming prompt from project settings');
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
      generateThemeName(cluster.representativeContent, index, customThemeNamingPrompt).then(
        (naming) => ({
          ...naming,
          color: THEME_COLORS[index % THEME_COLORS.length],
          highlightIds: cluster.highlightIds,
          confidence: clusterResult.silhouetteScore,
        })
      )
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
