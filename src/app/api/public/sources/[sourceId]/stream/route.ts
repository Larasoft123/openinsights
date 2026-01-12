import { NextRequest, NextResponse } from 'next/server';
import { validateShareLinkTenant, getSourceForPublicStream } from '@/lib/db/tenant-queries';
import { downloadFileStream, getFileSize } from '@/lib/services/storage.service';
import { logger } from '@/lib/logger';

const log = logger.child({ route: 'public-source-stream' });

// Self-hosted uses tenant_default schema
const SCHEMA_NAME = 'tenant_default';

interface RouteContext {
  params: Promise<{ sourceId: string }>;
}

/**
 * GET /api/public/sources/[sourceId]/stream?token=xxx
 *
 * Public streaming endpoint for shared sources.
 * Requires a valid share token as query parameter.
 * Supports Range requests for video seeking.
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { sourceId } = await context.params;
    const token = request.nextUrl.searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Share token required' }, { status: 401 });
    }

    // Validate the share link from tenant schema
    const shareLink = await validateShareLinkTenant(SCHEMA_NAME, token);

    if (!shareLink) {
      return NextResponse.json({ error: 'Invalid or expired share link' }, { status: 401 });
    }

    // Verify source access based on share type
    const isSourceShare = shareLink.sourceId !== null;

    if (isSourceShare) {
      // Direct source share - verify this is the shared source
      if (shareLink.sourceId !== sourceId) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    } else {
      // Project share - verify source belongs to the shared project
      const source = await getSourceForPublicStream(SCHEMA_NAME, sourceId);

      if (!source || source.projectId !== shareLink.project.id) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }

    // Fetch source to get file URL
    const source = await getSourceForPublicStream(SCHEMA_NAME, sourceId);

    if (!source) {
      return NextResponse.json({ error: 'Source not found' }, { status: 404 });
    }

    if (!source.fileUrl) {
      return NextResponse.json({ error: 'File not available' }, { status: 404 });
    }

    // Get file size for Range support
    const fileSize = await getFileSize(source.fileUrl);

    // Parse Range header
    const rangeHeader = request.headers.get('range');
    let start = 0;
    let end = fileSize - 1;

    if (rangeHeader) {
      const match = rangeHeader.match(/bytes=(\d*)-(\d*)/);
      if (match) {
        start = match[1] ? parseInt(match[1], 10) : 0;
        end = match[2] ? parseInt(match[2], 10) : fileSize - 1;
      }
    }

    // Clamp values
    start = Math.max(0, start);
    end = Math.min(end, fileSize - 1);
    const contentLength = end - start + 1;

    // Get file stream from S3/MinIO with range
    const stream = await downloadFileStream(source.fileUrl, { start, end });

    // Convert Node.js Readable to Web ReadableStream
    const webStream = new ReadableStream({
      start(controller) {
        stream.on('data', (chunk: Buffer) => {
          controller.enqueue(new Uint8Array(chunk));
        });
        stream.on('end', () => {
          controller.close();
        });
        stream.on('error', (err: Error) => {
          controller.error(err);
        });
      },
      cancel() {
        stream.destroy();
      },
    });

    log.info({ sourceId, token: token.slice(0, 8) + '...' }, 'Public source stream accessed');

    // Return partial content if Range was requested
    const status = rangeHeader ? 206 : 200;
    const headers: Record<string, string> = {
      'Content-Type': source.fileType,
      'Content-Length': contentLength.toString(),
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'private, max-age=3600',
    };

    if (rangeHeader) {
      headers['Content-Range'] = `bytes ${start}-${end}/${fileSize}`;
    }

    return new NextResponse(webStream, { status, headers });
  } catch (error) {
    log.error({ error }, 'Failed to stream public source');
    return NextResponse.json({ error: 'Failed to stream file' }, { status: 500 });
  }
}
