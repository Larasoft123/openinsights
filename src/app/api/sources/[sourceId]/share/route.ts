import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/api/auth';
import { handleAPIError } from '@/lib/api/error-handler';
import { verifySourceAccess } from '@/lib/api/permissions';
import { createSourceShareLink, getSourceShareLinks } from '@/lib/services/share.service';
import { logger } from '@/lib/logger';

const log = logger.child({ route: 'source-share' });

const createShareLinkSchema = z.object({
  expiresAt: z.string().datetime().nullable().optional(),
});

/**
 * GET /api/sources/[sourceId]/share
 * Get all share links for a source
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sourceId: string }> }
) {
  try {
    const { workspaceId } = await requireAuth();
    const { sourceId } = await params;

    await verifySourceAccess(sourceId, workspaceId);

    const shareLinks = await getSourceShareLinks(sourceId);

    return NextResponse.json({ shareLinks });
  } catch (error) {
    return handleAPIError(error, 'Failed to get share links');
  }
}

/**
 * POST /api/sources/[sourceId]/share
 * Create a new share link for a source
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ sourceId: string }> }
) {
  try {
    const { workspaceId, user } = await requireAuth();
    const { sourceId } = await params;

    await verifySourceAccess(sourceId, workspaceId);

    const body = await request.json();
    const result = createShareLinkSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: result.error.issues },
        { status: 400 }
      );
    }

    const { expiresAt } = result.data;

    const shareLink = await createSourceShareLink(sourceId, user.id, {
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    });

    log.info(
      { sourceId, shareLinkId: shareLink.id, token: shareLink.token },
      'Source share link created'
    );

    return NextResponse.json({
      id: shareLink.id,
      token: shareLink.token,
      expiresAt: shareLink.expiresAt,
      createdAt: shareLink.createdAt,
      source: shareLink.source,
    });
  } catch (error) {
    return handleAPIError(error, 'Failed to create share link');
  }
}
