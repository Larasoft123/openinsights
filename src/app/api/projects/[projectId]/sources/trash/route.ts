import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { deleteFile } from '@/lib/services/storage.service';
import { requireTenantAuth } from '@/lib/api/auth';
import { handleAPIError } from '@/lib/api/error-handler';
import { verifyProjectAccessTenant, listTrashedSources, emptyTrash } from '@/lib/db/tenant-queries';

const log = logger.child({ route: 'sources/trash' });

/**
 * GET /api/projects/[projectId]/sources/trash
 * List all trashed sources for a project
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { schemaName, workspaceId } = await requireTenantAuth();
    const { projectId } = await params;

    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace assigned' }, { status: 403 });
    }

    // Verify project access
    const project = await verifyProjectAccessTenant(schemaName, projectId, workspaceId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Fetch trashed sources from tenant schema
    const sources = await listTrashedSources(schemaName, projectId);

    return NextResponse.json({
      sources: sources.map((s) => ({
        id: s.id,
        title: s.title,
        fileName: s.fileName,
        fileType: s.fileType,
        status: s.status,
        duration: s.duration,
        segmentCount: s._count?.segments ?? 0,
        deletedAt: s.deletedAt instanceof Date ? s.deletedAt.toISOString() : s.deletedAt,
        createdAt: s.createdAt instanceof Date ? s.createdAt.toISOString() : s.createdAt,
        updatedAt: s.updatedAt instanceof Date ? s.updatedAt.toISOString() : s.updatedAt,
      })),
    });
  } catch (error) {
    return handleAPIError(error, 'Failed to list trashed sources');
  }
}

/**
 * DELETE /api/projects/[projectId]/sources/trash
 * Empty trash - permanently delete all trashed sources
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { schemaName, workspaceId } = await requireTenantAuth();
    const { projectId } = await params;

    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace assigned' }, { status: 403 });
    }

    // Verify project access
    const project = await verifyProjectAccessTenant(schemaName, projectId, workspaceId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Get all trashed sources to delete their files from S3
    const trashedSources = await listTrashedSources(schemaName, projectId);

    if (trashedSources.length === 0) {
      return NextResponse.json({ success: true, deletedCount: 0 });
    }

    log.info({ projectId, count: trashedSources.length }, 'Emptying trash');

    // Delete files from S3 (ignore errors for missing files)
    const deletePromises = trashedSources
      .filter((s) => s.fileUrl)
      .map(async (s) => {
        try {
          await deleteFile(s.fileUrl);
        } catch (error) {
          log.warn({ error, sourceId: s.id, fileUrl: s.fileUrl }, 'Failed to delete file from S3');
        }
      });

    await Promise.all(deletePromises);

    // Hard delete all trashed sources from tenant schema
    const deletedCount = await emptyTrash(schemaName, projectId);

    log.info({ projectId, deletedCount }, 'Trash emptied');

    return NextResponse.json({
      success: true,
      deletedCount,
    });
  } catch (error) {
    return handleAPIError(error, 'Failed to empty trash');
  }
}
