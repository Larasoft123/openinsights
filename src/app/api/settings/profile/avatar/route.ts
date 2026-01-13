import { NextResponse } from 'next/server';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { requireTenantAuth } from '@/lib/api/auth';
import { handleAPIError } from '@/lib/api/error-handler';
import { getPresignedUploadUrl } from '@/lib/services/storage.service';

const log = logger.child({ route: 'settings/profile/avatar' });

/**
 * Validation schema for avatar upload request
 */
const avatarUploadSchema = z.object({
  contentType: z.enum(['image/jpeg', 'image/png', 'image/gif', 'image/webp'], {
    message: 'Unsupported image type. Use JPEG, PNG, GIF, or WebP.',
  }),
  fileName: z.string().min(1, 'File name is required'),
});

/**
 * POST /api/settings/profile/avatar
 * Get a presigned URL for avatar upload
 *
 * Body:
 * {
 *   contentType: "image/jpeg" | "image/png" | "image/gif" | "image/webp",
 *   fileName: string
 * }
 *
 * Returns:
 * {
 *   uploadUrl: string,
 *   avatarUrl: string
 * }
 */
export async function POST(request: Request) {
  try {
    const { userId } = await requireTenantAuth();

    const body = await request.json();

    // Validate request body
    const result = avatarUploadSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: result.error.issues },
        { status: 400 }
      );
    }

    const { contentType, fileName } = result.data;

    // Extract file extension
    const extension = fileName.split('.').pop()?.toLowerCase() || 'jpg';
    const timestamp = Date.now();

    // Generate storage key: avatars/{userId}/{timestamp}.{ext}
    const key = `avatars/${userId}/${timestamp}.${extension}`;

    // Generate presigned upload URL (valid for 1 hour)
    const uploadUrl = await getPresignedUploadUrl(key, contentType, 3600);

    // Construct the public avatar URL
    // After upload, the image will be accessible at this URL
    const s3Endpoint = process.env.S3_ENDPOINT || 'http://localhost:9000';
    const s3Bucket = process.env.S3_BUCKET || 'openinsights';
    const avatarUrl = `${s3Endpoint}/${s3Bucket}/${key}`;

    log.info({ userId, key }, 'Avatar upload URL generated');

    return NextResponse.json({
      uploadUrl,
      avatarUrl,
      key,
    });
  } catch (error) {
    return handleAPIError(error, 'Failed to generate avatar upload URL');
  }
}
