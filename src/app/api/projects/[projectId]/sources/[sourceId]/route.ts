import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { deleteFile } from '@/lib/services/storage.service';
import { updateSourceSchema } from '@/lib/validations';
import { transcriptionQueue, vectorizationQueue } from '@/lib/queues';
import { requireTenantAuth } from '@/lib/api/auth';
import { handleAPIError } from '@/lib/api/error-handler';
import {
  verifyProjectAccessTenant,
  getSourceById,
  updateSource,
  deleteSource,
  countSegments,
  listSegments,
} from '@/lib/db/tenant-queries';

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
    const { schemaName, workspaceId } = await requireTenantAuth();
    const { projectId, sourceId } = await params;

    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace assigned' }, { status: 403 });
    }

    // Verify project access
    const project = await verifyProjectAccessTenant(schemaName, projectId, workspaceId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Get source from tenant schema
    const source = await getSourceById(schemaName, sourceId);

    if (!source || source.projectId !== projectId) {
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

    const { title, description, restore, retry, cancel } = parseResult.data;

    // Handle cancel request for stuck processing sources
    if (cancel === true) {
      if (source.status !== 'PROCESSING' && source.status !== 'UPLOADING') {
        return NextResponse.json(
          { error: 'Can only cancel processing or uploading sources' },
          { status: 400 }
        );
      }

      // Reset source status to FAILED so user can retry
      await updateSource(schemaName, sourceId, {
        status: 'FAILED',
        processingStep: null,
        processingProgress: 0,
        processingStartedAt: null,
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
      const segmentCount = await countSegments(schemaName, sourceId);

      if (segmentCount > 0) {
        // Transcription succeeded, retry vectorization
        const segments = await listSegments(schemaName, sourceId);

        await updateSource(schemaName, sourceId, {
          status: 'PROCESSING',
          processingStep: 'Vectorizing',
          processingProgress: 0,
          processingStartedAt: new Date(),
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

        await updateSource(schemaName, sourceId, {
          status: 'PROCESSING',
          processingStep: 'Transcribing',
          processingProgress: 0,
          processingStartedAt: new Date(),
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

    // Build update data for title/description/restore
    const updateData: { title?: string; description?: string | null; deletedAt?: null } = {};

    if (title !== undefined) {
      updateData.title = title;
    }

    if (description !== undefined) {
      updateData.description = description;
    }

    if (restore === true) {
      updateData.deletedAt = null;
      log.info({ sourceId }, 'Restoring source from trash');
    }

    // Update source in tenant schema
    const updated = await updateSource(schemaName, sourceId, updateData);

    if (!updated) {
      return NextResponse.json({ error: 'Failed to update source' }, { status: 500 });
    }

    log.info({ sourceId, updates: Object.keys(updateData) }, 'Source updated');

    return NextResponse.json({
      source: {
        id: updated.id,
        title: updated.title,
        description: updated.description ?? null,
        fileName: updated.fileName,
        fileType: updated.fileType,
        status: updated.status,
        duration: updated.duration,
        deletedAt: updated.deletedAt?.toISOString() ?? null,
        createdAt:
          updated.createdAt instanceof Date ? updated.createdAt.toISOString() : updated.createdAt,
        updatedAt:
          updated.updatedAt instanceof Date ? updated.updatedAt.toISOString() : updated.updatedAt,
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
    const { schemaName, workspaceId } = await requireTenantAuth();
    const { projectId, sourceId } = await params;
    const url = new URL(request.url);
    const permanent = url.searchParams.get('permanent') === 'true';

    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace assigned' }, { status: 403 });
    }

    // Verify project access
    const project = await verifyProjectAccessTenant(schemaName, projectId, workspaceId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Get source from tenant schema
    const source = await getSourceById(schemaName, sourceId);

    if (!source || source.projectId !== projectId) {
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

      // Hard delete from DB (cascades to segments and highlights via FK)
      await deleteSource(schemaName, sourceId, false);

      log.info({ sourceId }, 'Source permanently deleted');
      return NextResponse.json({ success: true, permanent: true });
    } else {
      // Soft delete: set deletedAt timestamp
      await deleteSource(schemaName, sourceId, true);

      log.info({ sourceId }, 'Source moved to trash');
      return NextResponse.json({ success: true, trashed: true });
    }
  } catch (error) {
    return handleAPIError(error, 'Failed to delete source');
  }
}
