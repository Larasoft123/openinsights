import { NextResponse } from 'next/server';
import { requireTenantAuth } from '@/lib/api/auth';
import { handleAPIError } from '@/lib/api/error-handler';
import { getPresetById, incrementPresetUseCount } from '@/lib/db/presets';
import { getProjectById, updateProject } from '@/lib/db/tenant-queries/projects';
import { createTag, getTagByName } from '@/lib/db/tenant-queries/tags';
import { createMetadataField, getMetadataFieldByName } from '@/lib/db/tenant-queries/metadata';
import { idSchema } from '@/lib/validations';
import { z } from 'zod';

interface RouteParams {
  params: Promise<{ projectId: string }>;
}

const applyPresetToProjectSchema = z.object({
  presetId: z.string().min(1, 'Preset ID is required'),
});

/**
 * POST /api/projects/[projectId]/apply-preset
 * Apply a preset to an existing project.
 *
 * Merge behavior:
 * - Tags: Add new tags that don't exist (by name)
 * - Metadata fields: Add new fields that don't exist (by name)
 * - AI prompts: Overwrite existing prompts
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { userId, schemaName } = await requireTenantAuth();
    const { projectId } = await params;

    // Validate project ID
    const projectIdResult = idSchema.safeParse(projectId);
    if (!projectIdResult.success) {
      return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 });
    }

    // Validate request body
    const body = await request.json();
    const result = applyPresetToProjectSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
    }

    const { presetId } = result.data;

    // Get the existing project
    const project = await getProjectById(schemaName, projectId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Get the preset
    const preset = await getPresetById(presetId, userId);
    if (!preset) {
      return NextResponse.json({ error: 'Preset not found' }, { status: 404 });
    }

    const { config } = preset;

    // Track what was applied
    const applied = {
      tags: { added: 0, skipped: 0 },
      metadataFields: { added: 0, skipped: 0 },
      aiPrompts: false,
    };

    // 1. Merge tags - add only new ones
    for (const tagDef of config.tags || []) {
      const existingTag = await getTagByName(schemaName, projectId, tagDef.name);
      if (existingTag) {
        applied.tags.skipped++;
        continue;
      }

      await createTag(schemaName, {
        projectId,
        name: tagDef.name,
        color: tagDef.color,
        description: tagDef.description || null,
      });
      applied.tags.added++;
    }

    // 2. Merge metadata fields - add only new ones
    for (const fieldDef of config.metadataFields || []) {
      const existingField = await getMetadataFieldByName(
        schemaName,
        'SOURCE',
        projectId,
        fieldDef.name
      );
      if (existingField) {
        applied.metadataFields.skipped++;
        continue;
      }

      await createMetadataField(schemaName, {
        entityType: 'SOURCE',
        parentId: projectId,
        name: fieldDef.name,
        label: fieldDef.label,
        fieldType: fieldDef.fieldType,
        options: fieldDef.options || [],
        required: fieldDef.required ?? false,
        placeholder: fieldDef.placeholder || null,
      });
      applied.metadataFields.added++;
    }

    // 3. Overwrite AI prompts if preset has any
    if (config.aiPrompts) {
      await updateProject(schemaName, projectId, {
        sourceSummaryPrompt: config.aiPrompts.sourceSummaryPrompt || null,
        projectSummaryPrompt: config.aiPrompts.projectSummaryPrompt || null,
        themeNamingPrompt: config.aiPrompts.themeNamingPrompt || null,
        autoTaggingPrompt: config.aiPrompts.autoTaggingPrompt || null,
        autoTaggingEnabled: config.aiPrompts.autoTaggingEnabled ?? false,
      });
      applied.aiPrompts = true;
    }

    // 4. Increment preset use count
    await incrementPresetUseCount(presetId);

    return NextResponse.json({
      success: true,
      appliedPreset: {
        id: preset.id,
        name: preset.name,
      },
      applied,
    });
  } catch (error) {
    return handleAPIError(error, 'Failed to apply preset to project');
  }
}
