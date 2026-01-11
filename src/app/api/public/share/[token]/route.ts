import { NextResponse } from 'next/server';
import {
  validateShareLink,
  getSharedProjectData,
  getSharedSourceData,
} from '@/lib/services/share.service';
import { logger } from '@/lib/logger';

const log = logger.child({ route: 'public-share' });

/**
 * GET /api/public/share/[token]
 * Public endpoint - validates share token and returns shared resource data
 * No authentication required
 */
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;

    // Validate the share link
    const shareLink = await validateShareLink(token);

    if (!shareLink) {
      return NextResponse.json({ error: 'Invalid or expired share link' }, { status: 404 });
    }

    // Determine share type and fetch appropriate data
    const isSourceShare = shareLink.sourceId !== null;

    if (isSourceShare) {
      // Source share - return source with transcript
      const sourceData = await getSharedSourceData(shareLink.sourceId!);

      if (!sourceData) {
        return NextResponse.json({ error: 'Shared resource not found' }, { status: 404 });
      }

      log.info({ token, sourceId: shareLink.sourceId }, 'Source share accessed');

      return NextResponse.json({
        type: 'source',
        shareLink: {
          id: shareLink.id,
          expiresAt: shareLink.expiresAt,
          createdAt: shareLink.createdAt,
        },
        data: sourceData,
      });
    } else {
      // Project share - return project with optional sections
      const projectData = await getSharedProjectData(shareLink.project.id, {
        includeEvidence: shareLink.includeEvidence,
        includeInsights: shareLink.includeInsights,
      });

      if (!projectData) {
        return NextResponse.json({ error: 'Shared resource not found' }, { status: 404 });
      }

      log.info({ token, projectId: shareLink.project.id }, 'Project share accessed');

      return NextResponse.json({
        type: 'project',
        shareLink: {
          id: shareLink.id,
          includeEvidence: shareLink.includeEvidence,
          includeInsights: shareLink.includeInsights,
          expiresAt: shareLink.expiresAt,
          createdAt: shareLink.createdAt,
        },
        data: projectData,
      });
    }
  } catch (error) {
    log.error({ error }, 'Failed to fetch shared resource');
    return NextResponse.json({ error: 'Failed to fetch shared resource' }, { status: 500 });
  }
}
