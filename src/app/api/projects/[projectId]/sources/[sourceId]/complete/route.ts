import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { fileExists, getPresignedDownloadUrl } from '@/lib/services/storage.service';
import { audioExtractionQueue, transcriptionQueue } from '@/lib/queues';

const log = logger.child({ route: 'sources/complete' });

/**
 * POST /api/projects/[projectId]/sources/[sourceId]/complete
 * Confirm upload completion and start processing pipeline
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ projectId: string; sourceId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId, sourceId } = await params;

    // Get user's current workspaceId from DB (more reliable than JWT which can be stale)
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { workspaceId: true },
    });

    if (!user?.workspaceId) {
      return NextResponse.json({ error: 'No workspace assigned' }, { status: 403 });
    }

    // Verify source exists and belongs to project in user's workspace
    const source = await prisma.source.findFirst({
      where: {
        id: sourceId,
        projectId,
        project: { workspaceId: user.workspaceId },
      },
    });

    if (!source) {
      return NextResponse.json({ error: 'Source not found' }, { status: 404 });
    }

    // Verify source is in UPLOADING status
    if (source.status !== 'UPLOADING') {
      return NextResponse.json(
        { error: `Invalid source status: ${source.status}. Expected UPLOADING.` },
        { status: 400 }
      );
    }

    // Verify file exists in S3
    const exists = await fileExists(source.fileUrl);
    if (!exists) {
      log.warn({ sourceId, fileUrl: source.fileUrl }, 'File not found in storage');
      return NextResponse.json(
        { error: 'File not found in storage. Please try uploading again.' },
        { status: 400 }
      );
    }

    // Update status to PROCESSING
    await prisma.source.update({
      where: { id: sourceId },
      data: { status: 'PROCESSING' },
    });

    // Generate presigned download URL for workers (1 hour expiry)
    const fileUrl = await getPresignedDownloadUrl(source.fileUrl, 3600);
    const isVideo = source.fileType.startsWith('video/');

    // Queue appropriate job based on file type
    // Standardized workflow: Video files always go through audio extraction first
    let jobId: string;

    if (isVideo) {
      // Video file: Extract audio first, then transcribe
      const job = await audioExtractionQueue.add(
        'audio-extraction',
        {
          sourceId,
          videoUrl: fileUrl,
        },
        { jobId: `audio-extraction-${sourceId}` }
      );
      jobId = job.id ?? `audio-extraction-${sourceId}`;
      log.info({ sourceId, jobId }, 'Queued audio extraction job');
    } else {
      // Audio file: Transcribe directly
      const job = await transcriptionQueue.add(
        'transcription',
        {
          sourceId,
          fileUrl,
          fileType: 'audio',
        },
        { jobId: `transcription-${sourceId}` }
      );
      jobId = job.id ?? `transcription-${sourceId}`;
      log.info({ sourceId, jobId }, 'Queued transcription job');
    }

    return NextResponse.json({
      source: {
        id: sourceId,
        status: 'PROCESSING',
      },
      jobId,
    });
  } catch (error) {
    log.error({ error }, 'Failed to complete upload');
    return NextResponse.json({ error: 'Failed to start processing' }, { status: 500 });
  }
}
