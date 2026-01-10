import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { createTranscriptSegmentSchema } from '@/lib/validations';
import { vectorizationQueue } from '@/lib/queues';
import { requireAuth } from '@/lib/api/auth';
import { handleAPIError } from '@/lib/api/error-handler';
import { verifySourceAccess } from '@/lib/api/permissions';

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
    const { workspaceId } = await requireAuth();
    const { sourceId } = await params;

    // Verify source access and get status
    const source = await verifySourceAccess(sourceId, workspaceId);

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
    return handleAPIError(error, 'Failed to create segment');
  }
}
