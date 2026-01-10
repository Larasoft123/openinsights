import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { deleteFile } from '@/lib/services/storage.service';
import { updateSourceSchema } from '@/lib/validations';
import { transcriptionQueue, vectorizationQueue } from '@/lib/queues';
import { requireAuth } from '@/lib/api/auth';
import { handleAPIError } from '@/lib/api/error-handler';
import { verifyProjectAccess } from '@/lib/api/permissions';

const log = logger.child({ route: 'sources/[sourceId]' });

/**
 * PATCH /api/projects/[projectId]/sources/[sourceId]
 * Update source title or restore from trash
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ projectId: string; sourceId: string }> }
) {
  try {
    const { workspaceId } = await requireAuth();
    const { projectId, sourceId } = await params;

    // Verify project access
    await verifyProjectAccess(projectId, workspaceId);

    // Get source
    const source = await prisma.source.findFirst({
      where: { id: sourceId, projectId },
    });

    if (!source) {
      return NextResponse.json({ error: 'Source not found' }, { status: 404 });
    }

    // Validate request body
    const body = await request.json();
    const parseResult = updateSourceSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parseResult.error.issues },
        { status: 400 }
      );
    }

    const { title, restore, retry, cancel } = parseResult.data;

    // Handle cancel request for stuck processing sources
    if (cancel === true) {
      if (source.status !== 'PROCESSING' && source.status !== 'UPLOADING') {
        return NextResponse.json(
          { error: 'Can only cancel processing or uploading sources' },
          { status: 400 }
        );
      }

      // Reset source status to FAILED so user can retry
      await prisma.source.update({
        where: { id: sourceId },
        data: {
          status: 'FAILED',
          processingStep: null,
          processingProgress: null,
          processingStartedAt: null,
        },
      });

      log.info({ sourceId }, 'Source processing cancelled');
      return NextResponse.json({ success: true, cancelled: true });
    }

    // Handle retry request for failed sources
    if (retry === true) {
      if (source.status !== 'FAILED') {
        return NextResponse.json({ error: 'Can only retry failed sources' }, { status: 400 });
      }

      // Check if segments exist to determine which job to queue
      const segmentCount = await prisma.transcriptSegment.count({
        where: { sourceId },
      });

      if (segmentCount > 0) {
        // Transcription succeeded, retry vectorization
        const segments = await prisma.transcriptSegment.findMany({
          where: { sourceId },
          select: { id: true },
        });

        await prisma.source.update({
          where: { id: sourceId },
          data: {
            status: 'PROCESSING',
            processingStep: 'Vectorizing',
            processingProgress: 0,
            processingStartedAt: new Date(),
          },
        });

        // Don't use fixed jobId - let BullMQ generate unique one for retries
        await vectorizationQueue.add(`vectorization-${sourceId}`, {
          sourceId,
          segmentIds: segments.map((s) => s.id),
        });

        log.info({ sourceId, segmentCount }, 'Retrying vectorization');
      } else {
        // No segments, retry transcription from scratch
        const fileType = source.fileType.startsWith('video/') ? 'video' : 'audio';

        await prisma.source.update({
          where: { id: sourceId },
          data: {
            status: 'PROCESSING',
            processingStep: 'Transcribing',
            processingProgress: 0,
            processingStartedAt: new Date(),
          },
        });

        // Don't use fixed jobId - let BullMQ generate unique one for retries
        await transcriptionQueue.add(`transcription-${sourceId}`, {
          sourceId,
          fileUrl: source.fileUrl,
          fileType,
        });

        log.info({ sourceId }, 'Retrying transcription');
      }

      return NextResponse.json({ success: true, retrying: true });
    }

    // Build update data for title/restore
    const updateData: { title?: string; deletedAt?: null } = {};

    if (title !== undefined) {
      updateData.title = title;
    }

    if (restore === true) {
      updateData.deletedAt = null;
      log.info({ sourceId }, 'Restoring source from trash');
    }

    // Update source
    const updated = await prisma.source.update({
      where: { id: sourceId },
      data: updateData,
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
      },
    });

    log.info({ sourceId, updates: Object.keys(updateData) }, 'Source updated');

    return NextResponse.json({
      source: {
        ...updated,
        deletedAt: updated.deletedAt?.toISOString() ?? null,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    return handleAPIError(error, 'Failed to update source');
  }
}

/**
 * DELETE /api/projects/[projectId]/sources/[sourceId]
 * Soft delete (move to trash) or permanent delete
 *
 * Query params:
 * - permanent=true: Permanently delete source and file from S3
 * - (default): Soft delete - sets deletedAt timestamp
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ projectId: string; sourceId: string }> }
) {
  try {
    const { workspaceId } = await requireAuth();
    const { projectId, sourceId } = await params;
    const url = new URL(request.url);
    const permanent = url.searchParams.get('permanent') === 'true';

    // Verify project access
    await verifyProjectAccess(projectId, workspaceId);

    // Get source
    const source = await prisma.source.findFirst({
      where: { id: sourceId, projectId },
    });

    if (!source) {
      return NextResponse.json({ error: 'Source not found' }, { status: 404 });
    }

    if (permanent) {
      // Permanent delete: remove file from S3 and hard delete from DB
      log.info({ sourceId, fileUrl: source.fileUrl }, 'Permanently deleting source');

      // Delete file from S3 (ignore errors if file doesn't exist)
      if (source.fileUrl) {
        try {
          await deleteFile(source.fileUrl);
        } catch (error) {
          log.warn({ error, sourceId, fileUrl: source.fileUrl }, 'Failed to delete file from S3');
        }
      }

      // Hard delete from DB (cascades to segments and highlights)
      await prisma.source.delete({
        where: { id: sourceId },
      });

      log.info({ sourceId }, 'Source permanently deleted');
      return NextResponse.json({ success: true, permanent: true });
    } else {
      // Soft delete: set deletedAt timestamp
      await prisma.source.update({
        where: { id: sourceId },
        data: { deletedAt: new Date() },
      });

      log.info({ sourceId }, 'Source moved to trash');
      return NextResponse.json({ success: true, trashed: true });
    }
  } catch (error) {
    return handleAPIError(error, 'Failed to delete source');
  }
}
