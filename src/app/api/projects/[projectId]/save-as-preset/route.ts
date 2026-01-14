import { NextResponse } from 'next/server';
import { requireTenantAuth } from '@/lib/api/auth';
import { handleAPIError } from '@/lib/api/error-handler';
import { createPreset, type PresetConfig } from '@/lib/db/presets';
import { getProjectById } from '@/lib/db/tenant-queries/projects';
import { listTags } from '@/lib/db/tenant-queries/tags';
import { listMetadataFields } from '@/lib/db/tenant-queries/metadata';
import { verifyProjectAccessTenant } from '@/lib/db/tenant-queries/access';
import { saveAsPresetSchema, idSchema } from '@/lib/validations';

interface RouteParams {
  params: Promise<{ projectId: string }>;
}

/**
 * POST /api/projects/[projectId]/save-as-preset
 * Save the current project's configuration as a reusable preset.
 *
 * Extracts:
 * - Tags (names, colors, descriptions)
 * - Metadata fields (SOURCE level)
 * - AI prompts (if configured)
 * - Project settings (type, goals, context)
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { userId, schemaName, workspaceId } = await requireTenantAuth();
    const { projectId } = await params;

    // Validate project ID
    const idResult = idSchema.safeParse(projectId);
    if (!idResult.success) {
      return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 });
    }

    // Verify project access
    const projectAccess = await verifyProjectAccessTenant(schemaName, projectId, workspaceId);
    if (!projectAccess) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Validate request body
    const body = await request.json();
    const result = saveAsPresetSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
    }

    const {
      name,
      description,
      category,
      includeTags,
      includeMetadataFields,
      includeAIPrompts,
      includeProjectSettings,
    } = result.data;

    // Get the full project
    const project = await getProjectById(schemaName, projectId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Build the preset config
    const config: PresetConfig = {
      tags: [],
      metadataFields: [],
      aiPrompts: {},
      projectSettings: {},
    };

    // 1. Extract tags if requested
    if (includeTags) {
      const tags = await listTags(schemaName, projectId);
      config.tags = tags.map((tag) => ({
        name: tag.name,
        color: tag.color,
        description: tag.description || undefined,
      }));
    }

    // 2. Extract metadata fields if requested (SOURCE level)
    if (includeMetadataFields) {
      const fields = await listMetadataFields(schemaName, 'SOURCE', projectId);
      config.metadataFields = fields.map((field) => ({
        name: field.name,
        label: field.label,
        fieldType: field.fieldType,
        options: field.options.length > 0 ? field.options : undefined,
        required: field.required || undefined,
        placeholder: field.placeholder || undefined,
      }));
    }

    // 3. Extract AI prompts if requested
    if (includeAIPrompts) {
      config.aiPrompts = {
        sourceSummaryPrompt: project.sourceSummaryPrompt || undefined,
        projectSummaryPrompt: project.projectSummaryPrompt || undefined,
        themeNamingPrompt: project.themeNamingPrompt || undefined,
        autoTaggingPrompt: project.autoTaggingPrompt || undefined,
        autoTaggingEnabled: project.autoTaggingEnabled || undefined,
      };
    }

    // 4. Extract project settings if requested
    if (includeProjectSettings) {
      config.projectSettings = {
        projectType: project.projectType || undefined,
        goals: project.goals || undefined,
        context: project.context || undefined,
      };
    }

    // Create the preset
    const preset = await createPreset({
      name,
      description,
      category,
      config,
      authorId: userId,
    });

    return NextResponse.json(
      {
        preset,
        extracted: {
          tags: config.tags.length,
          metadataFields: config.metadataFields.length,
          hasAIPrompts: Boolean(
            config.aiPrompts.sourceSummaryPrompt ||
            config.aiPrompts.projectSummaryPrompt ||
            config.aiPrompts.themeNamingPrompt
          ),
          hasProjectSettings: Boolean(
            config.projectSettings.projectType ||
            config.projectSettings.goals ||
            config.projectSettings.context
          ),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return handleAPIError(error, 'Failed to save project as preset');
  }
}
