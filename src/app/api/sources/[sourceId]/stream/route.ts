import { NextRequest, NextResponse } from 'next/server';
import { downloadFileStream, getFileSize } from '@/lib/services/storage.service';
import { requireTenantAuth } from '@/lib/api/auth';
import { handleAPIError } from '@/lib/api/error-handler';
import { verifySourceAccessTenant, getSourceById } from '@/lib/db/tenant-queries';

interface RouteContext {
  params: Promise<{ sourceId: string }>;
}

/**
 * GET /api/sources/[sourceId]/stream
 *
 * Streams the source video/audio file from S3/MinIO.
 * Supports Range requests for video seeking.
 */
export async function GET(request: NextRequest, context: RouteContext) {
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

    // Fetch source to get file URL
    const source = await getSourceById(schemaName, sourceId);

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
    return handleAPIError(error, 'Failed to stream file');
  }
}
