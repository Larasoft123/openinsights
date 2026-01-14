import { NextResponse } from 'next/server';
import { requireTenantAuth } from '@/lib/api/auth';
import { handleAPIError } from '@/lib/api/error-handler';
import { getPresetById, incrementPresetUseCount } from '@/lib/db/presets';
import { createProject } from '@/lib/db/tenant-queries/projects';
import { createTag } from '@/lib/db/tenant-queries/tags';
import { createMetadataField } from '@/lib/db/tenant-queries/metadata';
import { applyPresetSchema, idSchema } from '@/lib/validations';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/presets/[id]/apply
 * Apply a preset to create a new project with all configurations.
 *
 * Creates:
 * - Project with preset's project settings and AI prompts
 * - Tags from preset's tag definitions
 * - Metadata fields from preset's field definitions
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { userId, schemaName, workspaceId } = await requireTenantAuth();
    const { id: presetId } = await params;

    // Validate preset ID
    const idResult = idSchema.safeParse(presetId);
    if (!idResult.success) {
      return NextResponse.json({ error: 'Invalid preset ID' }, { status: 400 });
    }

    // Validate request body
    const body = await request.json();
    const result = applyPresetSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
    }

    const { projectName, projectDescription, projectLanguage } = result.data;

    // Get the preset
    const preset = await getPresetById(presetId, userId);
    if (!preset) {
      return NextResponse.json({ error: 'Preset not found' }, { status: 404 });
    }

    const { config } = preset;

    // 1. Create the project with preset settings and AI prompts
    const project = await createProject(schemaName, {
      workspaceId,
      name: projectName,
      description: projectDescription || null,
      language: projectLanguage,
      // Apply project settings from preset
      projectType: config.projectSettings?.projectType || null,
      goals: config.projectSettings?.goals || null,
      context: config.projectSettings?.context || null,
      // Apply AI prompts from preset
      sourceSummaryPrompt: config.aiPrompts?.sourceSummaryPrompt || null,
      projectSummaryPrompt: config.aiPrompts?.projectSummaryPrompt || null,
      themeNamingPrompt: config.aiPrompts?.themeNamingPrompt || null,
      autoTaggingPrompt: config.aiPrompts?.autoTaggingPrompt || null,
      autoTaggingEnabled: config.aiPrompts?.autoTaggingEnabled ?? false,
    });

    // 2. Create tags from preset
    const createdTags = [];
    for (const tagDef of config.tags || []) {
      const tag = await createTag(schemaName, {
        projectId: project.id,
        name: tagDef.name,
        color: tagDef.color,
        description: tagDef.description || null,
      });
      createdTags.push(tag);
    }

    // 3. Create metadata fields from preset (SOURCE level, attached to project)
    const createdFields = [];
    for (let i = 0; i < (config.metadataFields || []).length; i++) {
      const fieldDef = config.metadataFields[i];
      const field = await createMetadataField(schemaName, {
        entityType: 'SOURCE',
        parentId: project.id,
        name: fieldDef.name,
        label: fieldDef.label,
        fieldType: fieldDef.fieldType,
        options: fieldDef.options || [],
        required: fieldDef.required ?? false,
        placeholder: fieldDef.placeholder || null,
        displayOrder: i,
      });
      createdFields.push(field);
    }

    // 4. Increment preset use count
    await incrementPresetUseCount(presetId);

    return NextResponse.json(
      {
        project,
        appliedPreset: {
          id: preset.id,
          name: preset.name,
        },
        created: {
          tags: createdTags.length,
          metadataFields: createdFields.length,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return handleAPIError(error, 'Failed to apply preset');
  }
}
