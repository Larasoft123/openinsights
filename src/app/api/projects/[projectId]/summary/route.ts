import { NextResponse } from 'next/server';
import { idSchema } from '@/lib/validations';
import { requireTenantAuth } from '@/lib/api/auth';
import { handleAPIError } from '@/lib/api/error-handler';
import { verifyProjectAccessTenant, getProjectById, updateProject } from '@/lib/db/tenant-queries';
import { summaryGenerationQueue } from '@/lib/queues';
import { logger } from '@/lib/logger';

const log = logger.child({ route: 'projects/summary' });

/**
 * GET /api/projects/[projectId]/summary
 *
 * Fetches the summary for a project.
 * Returns summary data, status, and generation timestamp.
 */
export async function GET(
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

    // Fetch project summary
    const project = await getProjectById(schemaName, projectId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json({
      summary: project.summary,
      status: project.summaryStatus,
      generatedAt: project.summaryGeneratedAt,
    });
  } catch (error) {
    return handleAPIError(error, 'Failed to fetch summary');
  }
}

/**
 * POST /api/projects/[projectId]/summary
 *
 * Generates or regenerates the summary for a project.
 * Queues a background job to generate the summary using AI.
 * Aggregates summaries from all sources in the project.
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

    log.info({ projectId }, 'Queueing project summary generation');

    // Update status to pending
    await updateProject(schemaName, projectId, { summaryStatus: 'PENDING' });

    // Queue the summary generation job
    await summaryGenerationQueue.add(
      `summary-project-${projectId}`,
      { projectId },
      { jobId: `summary-project-${projectId}-${Date.now()}` }
    );

    log.info({ projectId }, 'Project summary generation queued');

    return NextResponse.json({
      message: 'Summary generation started',
      status: 'PENDING',
    });
  } catch (error) {
    return handleAPIError(error, 'Failed to start summary generation');
  }
}
