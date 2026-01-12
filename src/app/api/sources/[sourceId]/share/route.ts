import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireTenantAuth } from '@/lib/api/auth';
import { handleAPIError } from '@/lib/api/error-handler';
import {
  verifySourceAccessTenant,
  createSourceShareLinkTenant,
  listSourceShareLinksTenant,
} from '@/lib/db/tenant-queries';
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
    const { schemaName, workspaceId } = await requireTenantAuth();
    const { sourceId } = await params;

    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace assigned' }, { status: 403 });
    }

    const source = await verifySourceAccessTenant(schemaName, sourceId, workspaceId);
    if (!source) {
      return NextResponse.json({ error: 'Source not found' }, { status: 404 });
    }

    const shareLinks = await listSourceShareLinksTenant(schemaName, sourceId);

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
    const { schemaName, workspaceId, userId } = await requireTenantAuth();
    const { sourceId } = await params;

    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace assigned' }, { status: 403 });
    }

    const source = await verifySourceAccessTenant(schemaName, sourceId, workspaceId);
    if (!source) {
      return NextResponse.json({ error: 'Source not found' }, { status: 404 });
    }

    const body = await request.json();
    const result = createShareLinkSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: result.error.issues },
        { status: 400 }
      );
    }

    const { expiresAt } = result.data;

    const shareLink = await createSourceShareLinkTenant(schemaName, sourceId, userId, {
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
