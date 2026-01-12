import { Worker, Job } from 'bullmq';
import { connectionOptions } from '../connection';
import { QueueName, transcriptionJobSchema, TranscriptionJobData } from '../types';
import { vectorizationQueue } from '../index';
import { getTranscriptionProvider } from '../../ai';
import { updateSource, createSegmentsBatch } from '../../db/tenant-queries';
import { logger } from '../../logger';
import {
  getOrganizationAIConfig,
  getDefaultOrganizationId,
} from '../../services/organization-settings.service';

const log = logger.child({ worker: 'transcription' });

/**
 * Transcription Worker
 *
 * Uses the configured AI provider to transcribe media files:
 * - Deepgram: Native diarization, excellent accuracy (default)
 * - AssemblyAI: High-accuracy diarization
 * - OpenAI: Whisper-1 or gpt-4o-transcribe-diarize
 * - WhisperX: Self-hosted with pyannote diarization
 *
 * Flow:
 * 1. Get AI provider based on organization configuration
 * 2. Call provider's transcribe method
 * 3. Insert transcript segments into database
 * 4. Queue vectorization job
 */
async function processJob(job: Job<TranscriptionJobData>): Promise<void> {
  const startTime = Date.now();

  // Validate job data with Zod
  const data = transcriptionJobSchema.parse(job.data);
  const { sourceId, fileUrl, fileType, schemaName } = data;

  const jobLog = log.child({ jobId: job.id, sourceId, fileType, schemaName });
  jobLog.info('Starting transcription');

  try {
    // Update source status to PROCESSING with progress tracking
    await updateSource(schemaName, sourceId, {
      status: 'PROCESSING',
      processingStep: 'transcribing',
      processingProgress: 0,
      processingStartedAt: new Date(),
    });

    await job.updateProgress(10);

    // Get organization AI configuration (for self-hosted, always default org)
    const organizationId = await getDefaultOrganizationId();
    const orgConfig = await getOrganizationAIConfig(organizationId);
    jobLog.debug(
      { organizationId, provider: orgConfig?.transcriptionProvider },
      'Retrieved organization AI config'
    );

    // Get transcription provider based on organization config
    const provider = getTranscriptionProvider(orgConfig || {});
    jobLog.info({ provider: provider.name }, 'Using transcription provider');

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
      await updateSource(schemaName, sourceId, {
        duration: Math.round(result.duration),
      });
    }

    // Insert transcript segments into database using batch insert
    jobLog.info('Inserting transcript segments');

    const segmentsToCreate = result.segments.map((segment) => ({
      sourceId,
      content: segment.content,
      startTime: segment.startTime,
      endTime: segment.endTime,
      speakerId: segment.speakerId ?? null,
    }));

    const createdSegments = await createSegmentsBatch(schemaName, segmentsToCreate);
    const segmentIds = createdSegments.map((s) => s.id);

    jobLog.info({ insertedCount: segmentIds.length }, 'Segments inserted');
    await job.updateProgress(80);

    // Queue vectorization job
    if (segmentIds.length > 0) {
      // Update progress step to vectorizing
      await updateSource(schemaName, sourceId, {
        processingStep: 'vectorizing',
        processingProgress: 0,
      });

      await vectorizationQueue.add(
        'vectorization',
        {
          sourceId,
          segmentIds,
          schemaName,
        },
        { jobId: `vectorization-${sourceId}` }
      );
      jobLog.info('Vectorization job queued');
    } else {
      // No segments, mark as completed directly
      await updateSource(schemaName, sourceId, {
        status: 'COMPLETED',
        processingStep: null,
        processingProgress: 0,
        processingStartedAt: null,
      });
      jobLog.info('No segments to vectorize, source marked complete');
    }

    const duration = Date.now() - startTime;
    jobLog.info({ duration }, 'Transcription complete');
    await job.updateProgress(100);
  } catch (error) {
    jobLog.error({ error }, 'Transcription failed');

    // Update source status to FAILED
    await updateSource(schemaName, sourceId, { status: 'FAILED' });

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
