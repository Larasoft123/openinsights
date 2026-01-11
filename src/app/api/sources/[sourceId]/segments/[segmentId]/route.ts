import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { updateTranscriptSegmentSchema } from '@/lib/validations';
import { vectorizationQueue } from '@/lib/queues';
import { requireAuth } from '@/lib/api/auth';
import { handleAPIError } from '@/lib/api/error-handler';
import { verifySourceAccess } from '@/lib/api/permissions';

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
    const { workspaceId } = await requireAuth();
    const { sourceId, segmentId } = await params;

    // Verify source access
    await verifySourceAccess(sourceId, workspaceId);

    // Verify segment belongs to source
    const segment = await prisma.transcriptSegment.findFirst({
      where: { id: segmentId, sourceId },
    });

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

    // Update segment
    const updated = await prisma.transcriptSegment.update({
      where: { id: segmentId },
      data: updateData,
    });

    // If content changed, re-vectorize
    if (content !== undefined) {
      await prisma.$executeRaw`
        UPDATE transcript_segments
        SET embedding = NULL
        WHERE id = ${segmentId}
      `;

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
    const { workspaceId } = await requireAuth();
    const { sourceId, segmentId } = await params;

    // Verify source access
    await verifySourceAccess(sourceId, workspaceId);

    // Verify segment belongs to source
    const segment = await prisma.transcriptSegment.findFirst({
      where: { id: segmentId, sourceId },
      include: { _count: { select: { highlights: true } } },
    });

    if (!segment) {
      return NextResponse.json({ error: 'Segment not found' }, { status: 404 });
    }

    // Delete segment (highlights cascade automatically)
    await prisma.transcriptSegment.delete({
      where: { id: segmentId },
    });

    log.info(
      { sourceId, segmentId, highlightsDeleted: segment._count.highlights },
      'Segment deleted'
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleAPIError(error, 'Failed to delete segment');
  }
}
