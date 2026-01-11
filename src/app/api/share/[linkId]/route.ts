import { NextResponse } from 'next/server';
import { requireTenantAuth } from '@/lib/api/auth';
import { handleAPIError } from '@/lib/api/error-handler';
import { revokeShareLink } from '@/lib/services/share.service';
import { logger } from '@/lib/logger';

const log = logger.child({ route: 'share-revoke' });

/**
 * DELETE /api/share/[linkId]
 * Revoke a share link
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ linkId: string }> }
) {
  try {
    const { userId } = await requireTenantAuth();
    const { linkId } = await params;

    const revokedLink = await revokeShareLink(linkId, userId);

    log.info({ linkId }, 'Share link revoked');

    return NextResponse.json({
      id: revokedLink.id,
      isActive: revokedLink.isActive,
      message: 'Share link revoked successfully',
    });
  } catch (error) {
    return handleAPIError(error, 'Failed to revoke share link');
  }
}
