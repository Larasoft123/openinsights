import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { deleteFile } from '@/lib/services/storage.service';
import { requireAuth } from '@/lib/api/auth';
import { handleAPIError } from '@/lib/api/error-handler';
import { verifyProjectAccess } from '@/lib/api/permissions';

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
    const { workspaceId } = await requireAuth();
    const { projectId } = await params;

    // Verify project access
    await verifyProjectAccess(projectId, workspaceId);

    // Fetch trashed sources
    const sources = await prisma.source.findMany({
      where: {
        projectId,
        deletedAt: { not: null },
      },
      select: {
        id: true,
        title: true,
        fileName: true,
        fileType: true,
        status: true,
        duration: true,
        deletedAt: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            segments: true,
          },
        },
      },
      orderBy: { deletedAt: 'desc' },
    });

    return NextResponse.json({
      sources: sources.map((s) => ({
        id: s.id,
        title: s.title,
        fileName: s.fileName,
        fileType: s.fileType,
        status: s.status,
        duration: s.duration,
        segmentCount: s._count.segments,
        deletedAt: s.deletedAt?.toISOString() ?? null,
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
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
    const { workspaceId } = await requireAuth();
    const { projectId } = await params;

    // Verify project access
    await verifyProjectAccess(projectId, workspaceId);

    // Get all trashed sources
    const trashedSources = await prisma.source.findMany({
      where: {
        projectId,
        deletedAt: { not: null },
      },
      select: {
        id: true,
        fileUrl: true,
      },
    });

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

    // Hard delete all trashed sources from DB
    const result = await prisma.source.deleteMany({
      where: {
        projectId,
        deletedAt: { not: null },
      },
    });

    log.info({ projectId, deletedCount: result.count }, 'Trash emptied');

    return NextResponse.json({
      success: true,
      deletedCount: result.count,
    });
  } catch (error) {
    return handleAPIError(error, 'Failed to empty trash');
  }
}
