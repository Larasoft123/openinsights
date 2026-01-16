import { NextResponse } from 'next/server';
import { z } from 'zod';
import { idSchema } from '@/lib/validations';
import { requireTenantAuth } from '@/lib/api/auth';
import { handleAPIError } from '@/lib/api/error-handler';
import { verifyProjectAccessTenant, getProjectById, updateProject } from '@/lib/db/tenant-queries';
import { summaryGenerationQueue } from '@/lib/queues';
import { logger } from '@/lib/logger';

const log = logger.child({ route: 'projects/summary/regenerate' });

const regenerateSchema = z.object({
  guideline: z.string().nullish(),
});

/**
 * POST /api/projects/[projectId]/summary/regenerate
 *
 * Regenerates the summary for a project with an optional guideline update.
 * Optionally updates the project's projectSummaryPrompt before regenerating.
 *
 * Body:
 * - guideline?: string - Optional new guideline to save to project settings
 *
 * Actions:
 * 1. Validates project access
 * 2. If guideline provided, updates project.projectSummaryPrompt
 * 3. Sets project.summaryStatus to 'PENDING'
 * 4. Queues summary generation job
 *
 * Returns: { success: true, status: 'PENDING' }
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { schemaName, workspaceId } = await requireTenantAuth();
    const { projectId } = await params;

    // Validate projectId
    const parseResult = idSchema.safeParse(projectId);
    if (!parseResult.success) {
      return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 });
    }

    // Verify access
    const accessCheck = await verifyProjectAccessTenant(schemaName, projectId, workspaceId);
    if (!accessCheck) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Check if project exists and has sources
    const project = await getProjectById(schemaName, projectId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Check if already generating
    if (project.summaryStatus === 'GENERATING') {
      return NextResponse.json(
        { error: 'Summary generation is already in progress' },
        { status: 409 }
      );
    }

    // Check if project has sources
    if (!project._count || project._count.sources === 0) {
      return NextResponse.json({ error: 'Project has no sources to summarize' }, { status: 400 });
    }

    // Parse request body
    const body = await request.json().catch(() => ({}));
    const bodyParseResult = regenerateSchema.safeParse(body);
    if (!bodyParseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: bodyParseResult.error.issues },
        { status: 400 }
      );
    }

    const { guideline } = bodyParseResult.data;

    // If guideline provided, update project's projectSummaryPrompt
    if (guideline !== undefined) {
      await updateProject(schemaName, projectId, {
        projectSummaryPrompt: guideline,
      });
      log.info({ projectId }, 'Updated projectSummaryPrompt guideline');
    }

    log.info({ projectId }, 'Queueing project summary regeneration');

    // Update status to pending
    await updateProject(schemaName, projectId, { summaryStatus: 'PENDING' });

    // Queue the summary generation job
    await summaryGenerationQueue.add(
      `summary-project-${projectId}`,
      { projectId },
      { jobId: `summary-project-${projectId}-${Date.now()}` }
    );

    log.info({ projectId }, 'Project summary regeneration queued');

    return NextResponse.json({
      success: true,
      status: 'PENDING',
      message: 'Summary regeneration started',
    });
  } catch (error) {
    return handleAPIError(error, 'Failed to regenerate project summary');
  }
}
