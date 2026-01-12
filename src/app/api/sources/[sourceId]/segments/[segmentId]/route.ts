import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { updateTranscriptSegmentSchema } from '@/lib/validations';
import { vectorizationQueue } from '@/lib/queues';
import { requireTenantAuth } from '@/lib/api/auth';
import { handleAPIError } from '@/lib/api/error-handler';
import {
  verifySourceAccessTenant,
  verifySegmentBelongsToSource,
  getSegmentWithHighlightCount,
  updateSegment,
  deleteSegment,
  clearSegmentEmbedding,
} from '@/lib/db/tenant-queries';

const log = logger.child({ route: 'sources/[sourceId]/segments/[segmentId]' });

/**
 * PATCH /api/sources/[sourceId]/segments/[segmentId]
 * Update segment content and re-vectorize
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ sourceId: string; segmentId: string }> }
) {
  try {
    const { schemaName, workspaceId } = await requireTenantAuth();
    const { sourceId, segmentId } = await params;

    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace assigned' }, { status: 403 });
    }

    // Verify source access
    const source = await verifySourceAccessTenant(schemaName, sourceId, workspaceId);
    if (!source) {
      return NextResponse.json({ error: 'Source not found' }, { status: 404 });
    }

    // Verify segment belongs to source
    const segment = await verifySegmentBelongsToSource(schemaName, segmentId, sourceId);
    if (!segment) {
      return NextResponse.json({ error: 'Segment not found' }, { status: 404 });
    }

    // Parse and validate request body
    const body = await request.json();
    const parseResult = updateTranscriptSegmentSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parseResult.error.issues },
        { status: 400 }
      );
    }

    const { content, speakerId } = parseResult.data;

    // Build update data - only include fields that were provided
    const updateData: { content?: string; speakerId?: string | null } = {};
    if (content !== undefined) {
      updateData.content = content;
    }
    if (speakerId !== undefined) {
      updateData.speakerId = speakerId;
    }

    // Update segment in tenant schema
    const updated = await updateSegment(schemaName, segmentId, updateData);
    if (!updated) {
      return NextResponse.json({ error: 'Failed to update segment' }, { status: 500 });
    }

    // If content changed, re-vectorize
    if (content !== undefined) {
      await clearSegmentEmbedding(schemaName, segmentId);

      await vectorizationQueue.add(`vectorization-segment-${segmentId}`, {
        sourceId,
        segmentIds: [segmentId],
      });

      log.info({ sourceId, segmentId }, 'Segment content updated, queued for re-vectorization');
    } else {
      log.info({ sourceId, segmentId, speakerId }, 'Segment speaker updated');
    }

    return NextResponse.json({
      segment: {
        id: updated.id,
        content: updated.content,
        startTime: updated.startTime,
        endTime: updated.endTime,
        speakerId: updated.speakerId,
      },
    });
  } catch (error) {
    return handleAPIError(error, 'Failed to update segment');
  }
}

/**
 * DELETE /api/sources/[sourceId]/segments/[segmentId]
 * Permanently delete a segment (cascades to highlights)
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ sourceId: string; segmentId: string }> }
) {
  try {
    const { schemaName, workspaceId } = await requireTenantAuth();
    const { sourceId, segmentId } = await params;

    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace assigned' }, { status: 403 });
    }

    // Verify source access
    const source = await verifySourceAccessTenant(schemaName, sourceId, workspaceId);
    if (!source) {
      return NextResponse.json({ error: 'Source not found' }, { status: 404 });
    }

    // Verify segment belongs to source and get highlight count
    const segment = await getSegmentWithHighlightCount(schemaName, segmentId, sourceId);
    if (!segment) {
      return NextResponse.json({ error: 'Segment not found' }, { status: 404 });
    }

    // Delete segment (highlights cascade automatically via FK)
    await deleteSegment(schemaName, segmentId);

    log.info(
      { sourceId, segmentId, highlightsDeleted: segment._count.highlights },
      'Segment deleted'
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleAPIError(error, 'Failed to delete segment');
  }
}
