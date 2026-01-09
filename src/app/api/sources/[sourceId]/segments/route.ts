import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { idSchema, createTranscriptSegmentSchema } from '@/lib/validations';
import { vectorizationQueue } from '@/lib/queues';

const log = logger.child({ route: 'sources/[sourceId]/segments' });

/**
 * POST /api/sources/[sourceId]/segments
 * Create a new transcript segment with manual timestamp entry
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ sourceId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sourceId } = await params;

    // Validate sourceId
    const sourceIdResult = idSchema.safeParse(sourceId);
    if (!sourceIdResult.success) {
      return NextResponse.json({ error: 'Invalid source ID' }, { status: 400 });
    }

    // Get user's workspace
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { workspaceId: true },
    });

    if (!user?.workspaceId) {
      return NextResponse.json({ error: 'No workspace assigned' }, { status: 403 });
    }

    // Verify source belongs to user's workspace and is completed
    const source = await prisma.source.findFirst({
      where: {
        id: sourceId,
        project: { workspaceId: user.workspaceId },
      },
      select: { id: true, status: true },
    });

    if (!source) {
      return NextResponse.json({ error: 'Source not found' }, { status: 404 });
    }

    if (source.status !== 'COMPLETED') {
      return NextResponse.json(
        { error: 'Can only add segments to completed sources' },
        { status: 400 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const parseResult = createTranscriptSegmentSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parseResult.error.issues },
        { status: 400 }
      );
    }

    const { content, startTime, endTime, speakerId } = parseResult.data;

    // Create segment
    const segment = await prisma.transcriptSegment.create({
      data: {
        sourceId,
        content,
        startTime,
        endTime,
        speakerId: speakerId || null,
      },
    });

    // Queue vectorization for the new segment
    await vectorizationQueue.add(`vectorization-new-segment-${segment.id}`, {
      sourceId,
      segmentIds: [segment.id],
    });

    log.info({ sourceId, segmentId: segment.id }, 'Segment created, queued for vectorization');

    return NextResponse.json(
      {
        segment: {
          id: segment.id,
          content: segment.content,
          startTime: segment.startTime,
          endTime: segment.endTime,
          speakerId: segment.speakerId,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    log.error({ error }, 'Failed to create segment');
    return NextResponse.json({ error: 'Failed to create segment' }, { status: 500 });
  }
}
