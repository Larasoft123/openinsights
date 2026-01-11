import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { idSchema } from '@/lib/validations';
import { requireAuth } from '@/lib/api/auth';
import { handleAPIError } from '@/lib/api/error-handler';
import { verifySourceAccess } from '@/lib/api/permissions';
import { summaryGenerationQueue } from '@/lib/queues';
import { logger } from '@/lib/logger';

const log = logger.child({ route: 'sources/summary' });

/**
 * GET /api/sources/[sourceId]/summary
 *
 * Fetches the summary for a source.
 * Returns summary data, status, and generation timestamp.
 */
export async function GET(request: Request, { params }: { params: Promise<{ sourceId: string }> }) {
  try {
    const { workspaceId } = await requireAuth();
    const { sourceId } = await params;

    // Validate sourceId
    const parseResult = idSchema.safeParse(sourceId);
    if (!parseResult.success) {
      return NextResponse.json({ error: 'Invalid source ID' }, { status: 400 });
    }

    // Verify access
    await verifySourceAccess(sourceId, workspaceId);

    // Fetch source summary
    const source = await prisma.source.findUnique({
      where: { id: sourceId },
      select: {
        id: true,
        summary: true,
        summaryStatus: true,
        summaryGeneratedAt: true,
      },
    });

    if (!source) {
      return NextResponse.json({ error: 'Source not found' }, { status: 404 });
    }

    return NextResponse.json({
      summary: source.summary,
      status: source.summaryStatus,
      generatedAt: source.summaryGeneratedAt,
    });
  } catch (error) {
    return handleAPIError(error, 'Failed to fetch summary');
  }
}

/**
 * POST /api/sources/[sourceId]/summary
 *
 * Generates or regenerates the summary for a source.
 * Queues a background job to generate the summary using AI.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ sourceId: string }> }
) {
  try {
    const { workspaceId } = await requireAuth();
    const { sourceId } = await params;

    // Validate sourceId
    const parseResult = idSchema.safeParse(sourceId);
    if (!parseResult.success) {
      return NextResponse.json({ error: 'Invalid source ID' }, { status: 400 });
    }

    // Verify access
    await verifySourceAccess(sourceId, workspaceId);

    // Check if source exists and has segments
    const source = await prisma.source.findUnique({
      where: { id: sourceId },
      select: {
        id: true,
        status: true,
        summaryStatus: true,
        _count: { select: { segments: true } },
      },
    });

    if (!source) {
      return NextResponse.json({ error: 'Source not found' }, { status: 404 });
    }

    // Check if source is ready (transcription completed)
    if (source.status !== 'COMPLETED') {
      return NextResponse.json(
        { error: 'Source is not ready for summarization. Wait for processing to complete.' },
        { status: 400 }
      );
    }

    // Check if already generating
    if (source.summaryStatus === 'GENERATING') {
      return NextResponse.json(
        { error: 'Summary generation is already in progress' },
        { status: 409 }
      );
    }

    // Check if source has segments
    if (source._count.segments === 0) {
      return NextResponse.json({ error: 'Source has no transcript segments' }, { status: 400 });
    }

    log.info({ sourceId }, 'Queueing summary generation');

    // Update status to pending
    await prisma.source.update({
      where: { id: sourceId },
      data: { summaryStatus: 'PENDING' },
    });

    // Queue the summary generation job
    await summaryGenerationQueue.add(
      `summary-source-${sourceId}`,
      { sourceId },
      { jobId: `summary-source-${sourceId}-${Date.now()}` }
    );

    log.info({ sourceId }, 'Summary generation queued');

    return NextResponse.json({
      message: 'Summary generation started',
      status: 'PENDING',
    });
  } catch (error) {
    return handleAPIError(error, 'Failed to start summary generation');
  }
}
