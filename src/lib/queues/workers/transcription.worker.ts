import { Worker, Job } from 'bullmq';
import { connectionOptions } from '../connection';
import { QueueName, transcriptionJobSchema, TranscriptionJobData } from '../types';
import { vectorizationQueue } from '../index';
import { getProvider } from '../../ai';
import { prisma } from '../../db';
import { logger } from '../../logger';

const log = logger.child({ worker: 'transcription' });

/**
 * Transcription Worker
 *
 * Uses the configured AI provider to transcribe media files:
 * - Gemini: Processes video directly (native video input)
 * - OpenAI: Processes extracted audio (requires audio extraction first)
 *
 * Flow:
 * 1. Get AI provider based on configuration
 * 2. Call provider's transcribe method
 * 3. Insert transcript segments into database
 * 4. Queue vectorization job
 */
async function processJob(job: Job<TranscriptionJobData>): Promise<void> {
  const startTime = Date.now();

  // Validate job data with Zod
  const data = transcriptionJobSchema.parse(job.data);
  const { sourceId, fileUrl, fileType } = data;

  const jobLog = log.child({ jobId: job.id, sourceId, fileType });
  jobLog.info('Starting transcription');

  try {
    // Update source status to PROCESSING with progress tracking
    await prisma.source.update({
      where: { id: sourceId },
      data: {
        status: 'PROCESSING',
        processingStep: 'transcribing',
        processingProgress: null,
        processingStartedAt: new Date(),
      },
    });

    await job.updateProgress(10);

    // Get configured AI provider
    const provider = getProvider();
    jobLog.info({ provider: provider.name }, 'Using AI provider');

    // Transcribe media
    jobLog.info('Sending to AI provider for transcription');
    await job.updateProgress(20);

    const result = await provider.transcribe({
      sourceId,
      fileUrl,
      fileType,
    });

    jobLog.info(
      { segmentCount: result.segments.length, duration: result.duration },
      'Transcription received'
    );
    await job.updateProgress(60);

    // Update source duration if available
    if (result.duration > 0) {
      await prisma.source.update({
        where: { id: sourceId },
        data: { duration: Math.round(result.duration) },
      });
    }

    // Insert transcript segments into database
    jobLog.info('Inserting transcript segments');

    const createdSegments = await prisma.$transaction(
      result.segments.map((segment) =>
        prisma.transcriptSegment.create({
          data: {
            sourceId,
            content: segment.content,
            startTime: segment.startTime,
            endTime: segment.endTime,
            speakerId: segment.speakerId,
          },
        })
      )
    );

    const segmentIds = createdSegments.map((s) => s.id);
    jobLog.info({ insertedCount: segmentIds.length }, 'Segments inserted');
    await job.updateProgress(80);

    // Queue vectorization job
    if (segmentIds.length > 0) {
      // Update progress step to vectorizing
      await prisma.source.update({
        where: { id: sourceId },
        data: {
          processingStep: 'vectorizing',
          processingProgress: 0,
        },
      });

      await vectorizationQueue.add(
        'vectorization',
        {
          sourceId,
          segmentIds,
        },
        { jobId: `vectorization-${sourceId}` }
      );
      jobLog.info('Vectorization job queued');
    } else {
      // No segments, mark as completed directly
      await prisma.source.update({
        where: { id: sourceId },
        data: {
          status: 'COMPLETED',
          processingStep: null,
          processingProgress: null,
          processingStartedAt: null,
        },
      });
      jobLog.info('No segments to vectorize, source marked complete');
    }

    const duration = Date.now() - startTime;
    jobLog.info({ duration }, 'Transcription complete');
    await job.updateProgress(100);
  } catch (error) {
    jobLog.error({ error }, 'Transcription failed');

    // Update source status to FAILED
    await prisma.source.update({
      where: { id: sourceId },
      data: { status: 'FAILED' },
    });

    throw error;
  }
}

// Create the worker
const concurrency = parseInt(process.env.WORKER_CONCURRENCY || '2', 10);

export const transcriptionWorker = new Worker<TranscriptionJobData>(
  QueueName.TRANSCRIPTION,
  processJob,
  {
    connection: connectionOptions,
    concurrency,
  }
);

// Event handlers
transcriptionWorker.on('completed', (job) => {
  log.info({ jobId: job.id, sourceId: job.data.sourceId }, 'Job completed');
});

transcriptionWorker.on('failed', (job, error) => {
  log.error({ jobId: job?.id, sourceId: job?.data.sourceId, error }, 'Job failed');
});

transcriptionWorker.on('error', (error) => {
  log.error({ error }, 'Worker error');
});

// Graceful shutdown
export async function shutdownTranscriptionWorker(): Promise<void> {
  log.info('Shutting down transcription worker');
  await transcriptionWorker.close();
  log.info('Transcription worker shut down');
}
