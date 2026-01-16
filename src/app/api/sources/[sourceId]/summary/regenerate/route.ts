import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireTenantAuth } from '@/lib/api/auth';
import { handleAPIError } from '@/lib/api/error-handler';
import {
  verifySourceAccessTenant,
  getSourceById,
  updateSource,
  updateProject,
  countSegments,
} from '@/lib/db/tenant-queries';
import { summaryGenerationQueue } from '@/lib/queues';
import { logger } from '@/lib/logger';

const log = logger.child({ route: 'sources/summary/regenerate' });

const regenerateSchema = z.object({
  guideline: z.string().nullish(),
});

/**
 * POST /api/sources/[sourceId]/summary/regenerate
 *
 * Regenerates the summary for a source with an optional guideline update.
 * Optionally updates the project's sourceSummaryPrompt before regenerating.
 *
 * Body:
 * - guideline?: string - Optional new guideline to save to project settings
 *
 * Actions:
 * 1. Validates source access
 * 2. If guideline provided, updates project.sourceSummaryPrompt
 * 3. Sets source.summaryStatus to 'PENDING'
 * 4. Queues summary generation job
 *
 * Returns: { success: true, status: 'PENDING' }
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ sourceId: string }> }
) {
  try {
    const { schemaName, workspaceId } = await requireTenantAuth();
    const { sourceId } = await params;

    // Verify source access
    const sourceAccess = await verifySourceAccessTenant(schemaName, sourceId, workspaceId);
    if (!sourceAccess) {
      return NextResponse.json({ error: 'Source not found' }, { status: 404 });
    }

    // Get full source details to get projectId
    const source = await getSourceById(schemaName, sourceId);
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
    const segmentCount = await countSegments(schemaName, sourceId);
    if (segmentCount === 0) {
      return NextResponse.json({ error: 'Source has no transcript segments' }, { status: 400 });
    }

    // Parse request body
    const body = await request.json().catch(() => ({}));
    const parseResult = regenerateSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parseResult.error.issues },
        { status: 400 }
      );
    }

    const { guideline } = parseResult.data;
    const projectId = source.projectId;

    // If guideline provided, update project's sourceSummaryPrompt
    if (guideline !== undefined) {
      await updateProject(schemaName, projectId, {
        sourceSummaryPrompt: guideline,
      });
      log.info({ projectId, sourceId }, 'Updated sourceSummaryPrompt guideline');
    }

    log.info({ sourceId }, 'Queueing summary regeneration');

    // Update status to pending
    await updateSource(schemaName, sourceId, { summaryStatus: 'PENDING' });

    // Queue the summary generation job
    await summaryGenerationQueue.add(
      `summary-source-${sourceId}`,
      { sourceId },
      { jobId: `summary-source-${sourceId}-${Date.now()}` }
    );

    log.info({ sourceId }, 'Summary regeneration queued');

    return NextResponse.json({
      success: true,
      status: 'PENDING',
      message: 'Summary regeneration started',
    });
  } catch (error) {
    return handleAPIError(error, 'Failed to regenerate summary');
  }
}
