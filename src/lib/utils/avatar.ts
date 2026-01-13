/**
 * Avatar URL utilities
 *
 * S3/MinIO URLs are not publicly accessible, so we serve avatars
 * through a proxy endpoint that uses presigned URLs.
 */

/**
 * Transform an S3 URL to a proxy URL for display
 * @param url - The avatar URL (S3 or other)
 * @param userId - The user ID for the proxy endpoint (optional if URL contains it)
 * @returns Proxy URL or original URL for external avatars
 */
export function getAvatarUrl(
  url: string | null | undefined,
  userId?: string | null
): string | null {
  if (!url) return null;

  // Blob URLs are used for local previews during upload
  if (url.startsWith('blob:')) {
    return url;
  }

  // If it's already a proxy URL, use as-is
  if (url.startsWith('/api/')) {
    return url;
  }

  // If it's an S3/MinIO URL, extract the userId (if not provided) and timestamp
  // Format: http://localhost:9000/openinsights/avatars/{userId}/{timestamp}.ext
  const avatarMatch = url.match(/avatars\/([^/]+)\/(\d+)\./);
  if (avatarMatch) {
    const extractedUserId = userId || avatarMatch[1];
    const timestamp = avatarMatch[2];
    return `/api/avatars/${extractedUserId}?t=${timestamp}`;
  }

  // For other URLs (like OAuth provider avatars), use directly
  return url;
}
