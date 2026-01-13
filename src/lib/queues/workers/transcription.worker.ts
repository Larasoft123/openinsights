import { Worker, Job } from 'bullmq';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { connectionOptions } from '../connection';
import { QueueName, transcriptionJobSchema, TranscriptionJobData } from '../types';
import { vectorizationQueue } from '../index';
import { getTranscriptionProvider } from '../../ai';
import { updateSource, createSegmentsBatch, getSourceById } from '../../db/tenant-queries';
import { logger } from '../../logger';
import {
  getOrganizationAIConfig,
  getDefaultOrganizationId,
} from '../../services/organization-settings.service';
import { downloadFile, uploadFile, getThumbnailKey } from '../../services/storage.service';
import { generateAudioWaveform, killThumbnailProcess } from '../../services/thumbnail.service';

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

    await job.updateProgress(5);

    // Check if source already has a thumbnail (video files get thumbnail in audio-extraction)
    // If not, this is an audio-only file - generate waveform visualization
    const source = await getSourceById(schemaName, sourceId);
    if (source && !source.thumbnailUrl) {
      jobLog.info('Audio-only file detected, generating waveform thumbnail');

      // Create temp directory for waveform generation
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openinsights-waveform-'));
      const audioPath = path.join(tempDir, 'audio.mp3');
      const waveformPath = path.join(tempDir, 'waveform.jpg');

      try {
        // Download audio file - extract S3 key from source.fileUrl
        const audioBuffer = await downloadFile(source.fileUrl);
        await fs.writeFile(audioPath, audioBuffer);

        // Generate waveform image
        await generateAudioWaveform(audioPath, waveformPath);

        // Upload waveform to S3
        const waveformBuffer = await fs.readFile(waveformPath);
        const thumbnailKey = getThumbnailKey(sourceId);
        await uploadFile(thumbnailKey, waveformBuffer, { contentType: 'image/jpeg' });

        // Store S3 key (not presigned URL) - URLs are generated on-demand in API layer
        await updateSource(schemaName, sourceId, { thumbnailUrl: thumbnailKey });
        jobLog.info({ thumbnailKey }, 'Audio waveform generated and uploaded');
      } catch (waveformError) {
        // Waveform generation failure is non-fatal - log and continue
        jobLog.warn(
          { error: waveformError },
          'Waveform generation failed, continuing without thumbnail'
        );
      } finally {
        // Cleanup temp files
        try {
          await fs.rm(tempDir, { recursive: true, force: true });
        } catch {
          // Ignore cleanup errors
        }
      }
    }

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

  // Kill active waveform generation process
  killThumbnailProcess();

  await transcriptionWorker.close();
  log.info('Transcription worker shut down');
}
