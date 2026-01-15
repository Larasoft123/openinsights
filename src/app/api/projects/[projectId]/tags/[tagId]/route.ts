import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { tagSchema } from '@/lib/validations';
import { requireTenantAuth } from '@/lib/api/auth';
import { handleAPIError } from '@/lib/api/error-handler';
import {
  verifyProjectAccessTenant,
  getTagById,
  getTagByName,
  updateTag,
  deleteTag,
} from '@/lib/db/tenant-queries';

const log = logger.child({ route: 'tags/[tagId]' });

/**
 * PATCH /api/projects/[projectId]/tags/[tagId]
 * Update a tag's name, color, or description
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ projectId: string; tagId: string }> }
) {
  try {
    const { schemaName, workspaceId } = await requireTenantAuth();
    const { projectId, tagId } = await params;

    // Verify project access
    const project = await verifyProjectAccessTenant(schemaName, projectId, workspaceId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Verify tag exists and belongs to this project
    const existingTag = await getTagById(schemaName, tagId);
    if (!existingTag || existingTag.projectId !== projectId) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
    }

    const body = await request.json();

    // Validate request body (partial validation for updates)
    const result = tagSchema.partial().safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid tag data', details: result.error.issues },
        { status: 400 }
      );
    }

    const { name, color, description } = result.data;

    // Check for duplicate tag name if name is being changed
    if (name && name !== existingTag.name) {
      const duplicateTag = await getTagByName(schemaName, projectId, name);
      if (duplicateTag) {
        return NextResponse.json(
          { error: 'A tag with this name already exists in this project' },
          { status: 409 }
        );
      }
    }

    // Update the tag
    const updatedTag = await updateTag(schemaName, tagId, {
      name,
      color,
      description,
    });

    if (!updatedTag) {
      return NextResponse.json({ error: 'Failed to update tag' }, { status: 500 });
    }

    log.info({ projectId, tagId, changes: { name, color, description } }, 'Tag updated');

    return NextResponse.json({
      id: updatedTag.id,
      name: updatedTag.name,
      color: updatedTag.color,
      description: updatedTag.description,
    });
  } catch (error) {
    return handleAPIError(error, 'Failed to update tag');
  }
}

/**
 * DELETE /api/projects/[projectId]/tags/[tagId]
 * Delete a tag (cascades to delete associated highlights)
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ projectId: string; tagId: string }> }
) {
  try {
    const { schemaName, workspaceId } = await requireTenantAuth();
    const { projectId, tagId } = await params;

    // Verify project access
    const project = await verifyProjectAccessTenant(schemaName, projectId, workspaceId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Verify tag exists and belongs to this project
    const existingTag = await getTagById(schemaName, tagId);
    if (!existingTag || existingTag.projectId !== projectId) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
    }

    const highlightCount = existingTag._count?.highlights ?? 0;

    // Delete the tag (highlights will be cascade deleted)
    const deleted = await deleteTag(schemaName, tagId);

    if (!deleted) {
      return NextResponse.json({ error: 'Failed to delete tag' }, { status: 500 });
    }

    log.info(
      { projectId, tagId, tagName: existingTag.name, deletedHighlights: highlightCount },
      'Tag deleted'
    );

    return NextResponse.json({
      success: true,
      deletedHighlights: highlightCount,
    });
  } catch (error) {
    return handleAPIError(error, 'Failed to delete tag');
  }
}
