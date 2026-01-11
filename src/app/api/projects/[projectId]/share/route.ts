import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/api/auth';
import { handleAPIError } from '@/lib/api/error-handler';
import { verifyProjectAccess } from '@/lib/api/permissions';
import { createProjectShareLink, getProjectShareLinks } from '@/lib/services/share.service';
import { logger } from '@/lib/logger';

const log = logger.child({ route: 'project-share' });

const createShareLinkSchema = z.object({
  includeEvidence: z.boolean().optional().default(true),
  includeInsights: z.boolean().optional().default(true),
  expiresAt: z.string().datetime().nullable().optional(),
});

/**
 * GET /api/projects/[projectId]/share
 * Get all share links for a project
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { workspaceId } = await requireAuth();
    const { projectId } = await params;

    await verifyProjectAccess(projectId, workspaceId);

    const shareLinks = await getProjectShareLinks(projectId);

    return NextResponse.json({ shareLinks });
  } catch (error) {
    return handleAPIError(error, 'Failed to get share links');
  }
}

/**
 * POST /api/projects/[projectId]/share
 * Create a new share link for a project
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { workspaceId, user } = await requireAuth();
    const { projectId } = await params;

    await verifyProjectAccess(projectId, workspaceId);

    const body = await request.json();
    const result = createShareLinkSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: result.error.issues },
        { status: 400 }
      );
    }

    const { includeEvidence, includeInsights, expiresAt } = result.data;

    const shareLink = await createProjectShareLink(projectId, user.id, {
      includeEvidence,
      includeInsights,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    });

    log.info(
      { projectId, shareLinkId: shareLink.id, token: shareLink.token },
      'Project share link created'
    );

    return NextResponse.json({
      id: shareLink.id,
      token: shareLink.token,
      includeEvidence: shareLink.includeEvidence,
      includeInsights: shareLink.includeInsights,
      expiresAt: shareLink.expiresAt,
      createdAt: shareLink.createdAt,
    });
  } catch (error) {
    return handleAPIError(error, 'Failed to create share link');
  }
}
