import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { idSchema, updateTranscriptSegmentSchema } from '@/lib/validations';
import { vectorizationQueue } from '@/lib/queues';

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
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sourceId, segmentId } = await params;

    // Validate IDs
    const sourceIdResult = idSchema.safeParse(sourceId);
    const segmentIdResult = idSchema.safeParse(segmentId);
    if (!sourceIdResult.success || !segmentIdResult.success) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }

    // Get user's workspace
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { workspaceId: true },
    });

    if (!user?.workspaceId) {
      return NextResponse.json({ error: 'No workspace assigned' }, { status: 403 });
    }

    // Verify source belongs to user's workspace
    const source = await prisma.source.findFirst({
      where: {
        id: sourceId,
        project: { workspaceId: user.workspaceId },
      },
      select: { id: true },
    });

    if (!source) {
      return NextResponse.json({ error: 'Source not found' }, { status: 404 });
    }

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

    const { content } = parseResult.data;

    // Update segment content
    const updated = await prisma.transcriptSegment.update({
      where: { id: segmentId },
      data: { content },
    });

    // Clear existing embeddings and queue re-vectorization
    await prisma.$executeRaw`
      UPDATE transcript_segments
      SET embedding_768 = NULL, embedding_1536 = NULL
      WHERE id = ${segmentId}
    `;

    await vectorizationQueue.add(`vectorization-segment-${segmentId}`, {
      sourceId,
      segmentIds: [segmentId],
    });

    log.info({ sourceId, segmentId }, 'Segment updated, queued for re-vectorization');

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
    log.error({ error }, 'Failed to update segment');
    return NextResponse.json({ error: 'Failed to update segment' }, { status: 500 });
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
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sourceId, segmentId } = await params;

    // Validate IDs
    const sourceIdResult = idSchema.safeParse(sourceId);
    const segmentIdResult = idSchema.safeParse(segmentId);
    if (!sourceIdResult.success || !segmentIdResult.success) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }

    // Get user's workspace
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { workspaceId: true },
    });

    if (!user?.workspaceId) {
      return NextResponse.json({ error: 'No workspace assigned' }, { status: 403 });
    }

    // Verify source belongs to user's workspace
    const source = await prisma.source.findFirst({
      where: {
        id: sourceId,
        project: { workspaceId: user.workspaceId },
      },
      select: { id: true },
    });

    if (!source) {
      return NextResponse.json({ error: 'Source not found' }, { status: 404 });
    }

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
    log.error({ error }, 'Failed to delete segment');
    return NextResponse.json({ error: 'Failed to delete segment' }, { status: 500 });
  }
}
