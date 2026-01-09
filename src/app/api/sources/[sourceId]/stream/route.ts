import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { downloadFileStream } from '@/lib/services/storage.service';

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
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { sourceId } = await context.params;

  // Fetch source to get file URL and verify access
  const source = await prisma.source.findUnique({
    where: { id: sourceId },
    select: {
      fileUrl: true,
      fileType: true,
      project: {
        select: {
          workspaceId: true,
        },
      },
    },
  });

  if (!source) {
    return NextResponse.json({ error: 'Source not found' }, { status: 404 });
  }

  // Verify user has access to this source's workspace
  if (source.project.workspaceId !== session.user.workspaceId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (!source.fileUrl) {
    return NextResponse.json({ error: 'File not available' }, { status: 404 });
  }

  try {
    // Get file stream from S3/MinIO
    const stream = await downloadFileStream(source.fileUrl);

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

    return new NextResponse(webStream, {
      headers: {
        'Content-Type': source.fileType,
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Failed to stream file:', error);
    return NextResponse.json({ error: 'Failed to stream file' }, { status: 500 });
  }
}
