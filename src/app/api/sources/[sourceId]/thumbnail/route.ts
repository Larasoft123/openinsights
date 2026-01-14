import { NextRequest, NextResponse } from 'next/server';
import { downloadFile, getThumbnailKey, fileExists } from '@/lib/services/storage.service';
import { requireTenantAuth } from '@/lib/api/auth';
import { handleAPIError } from '@/lib/api/error-handler';
import { verifySourceAccessTenant } from '@/lib/db/tenant-queries';

interface RouteContext {
  params: Promise<{ sourceId: string }>;
}

/**
 * GET /api/sources/[sourceId]/thumbnail
 *
 * Proxies the source thumbnail image from S3/MinIO.
 * This avoids CORS/private IP issues with Next.js Image optimization.
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { schemaName, workspaceId } = await requireTenantAuth();
    const { sourceId } = await context.params;

    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace assigned' }, { status: 403 });
    }

    // Verify source access
    const accessCheck = await verifySourceAccessTenant(schemaName, sourceId, workspaceId);
    if (!accessCheck) {
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
