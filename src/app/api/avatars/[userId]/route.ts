import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getPresignedDownloadUrl } from '@/lib/services/storage.service';
import { logger } from '@/lib/logger';

const log = logger.child({ route: 'avatars' });

/**
 * GET /api/avatars/[userId]
 * Serves user avatar by fetching from S3 and streaming to client
 * (Redirect doesn't work due to CORS with MinIO)
 */
export async function GET(_request: Request, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const { userId } = await params;

    // Get user's avatar URL from database
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { image: true },
    });

    if (!user?.image) {
      return new NextResponse(null, { status: 404 });
    }

    // Extract the S3 key from the stored URL
    // URL format: http://localhost:9000/openinsights/avatars/userId/timestamp.ext
    const urlParts = user.image.split('/');
    const bucketIndex = urlParts.findIndex((part: string) => part === 'openinsights');

    if (bucketIndex === -1) {
      log.warn({ userId, image: user.image }, 'Invalid avatar URL format');
      return new NextResponse(null, { status: 404 });
    }

    const key = urlParts.slice(bucketIndex + 1).join('/');

    // Generate presigned download URL (valid for 1 hour)
    const presignedUrl = await getPresignedDownloadUrl(key, 3600);

    // Fetch the image from S3 and stream it to the client
    const imageResponse = await fetch(presignedUrl);

    if (!imageResponse.ok) {
      log.warn({ userId, status: imageResponse.status }, 'Failed to fetch avatar from S3');
      return new NextResponse(null, { status: 404 });
    }

    const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
    const imageBuffer = await imageResponse.arrayBuffer();

    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });
  } catch (error) {
    log.error({ error }, 'Failed to serve avatar');
    return new NextResponse(null, { status: 500 });
  }
}
