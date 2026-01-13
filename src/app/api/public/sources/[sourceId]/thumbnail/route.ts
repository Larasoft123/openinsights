import { NextRequest, NextResponse } from 'next/server';
import { downloadFile, getThumbnailKey, fileExists } from '@/lib/services/storage.service';
import { handleAPIError } from '@/lib/api/error-handler';
import {
  validateShareLinkTenant,
  getSourceById,
  DEFAULT_TENANT_SCHEMA,
} from '@/lib/db/tenant-queries';

interface RouteContext {
  params: Promise<{ sourceId: string }>;
}

/**
 * GET /api/public/sources/[sourceId]/thumbnail
 *
 * Proxies the source thumbnail image from S3/MinIO for shared sources.
 * Requires a valid share token as query parameter.
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { sourceId } = await context.params;
    const token = request.nextUrl.searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Share token required' }, { status: 401 });
    }

    // Validate share link
    const shareLink = await validateShareLinkTenant(DEFAULT_TENANT_SCHEMA, token);
    if (!shareLink) {
      return NextResponse.json({ error: 'Invalid share link' }, { status: 401 });
    }

    // Verify source belongs to the shared project or is the shared source
    const isSourceShare = shareLink.sourceId === sourceId;

    // For project shares, verify source belongs to the project
    let isProjectShare = false;
    if (!isSourceShare && shareLink.project) {
      const source = await getSourceById(DEFAULT_TENANT_SCHEMA, sourceId);
      isProjectShare = source?.projectId === shareLink.project.id;
    }

    if (!isSourceShare && !isProjectShare) {
      return NextResponse.json({ error: 'Source not found' }, { status: 404 });
    }

    // Check if thumbnail exists
    const thumbnailKey = getThumbnailKey(sourceId);
    const exists = await fileExists(thumbnailKey);

    if (!exists) {
      return NextResponse.json({ error: 'Thumbnail not found' }, { status: 404 });
    }

    // Download thumbnail from S3/MinIO
    const buffer = await downloadFile(thumbnailKey);

    // Return image with appropriate headers
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'image/jpeg',
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
      },
    });
  } catch (error) {
    return handleAPIError(error, 'Failed to fetch thumbnail');
  }
}
