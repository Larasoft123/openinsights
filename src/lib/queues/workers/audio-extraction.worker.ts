import { Worker, Job } from 'bullmq';
import { exec, ChildProcess } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { connectionOptions } from '../connection';
import { QueueName, audioExtractionJobSchema, AudioExtractionJobData } from '../types';
import { transcriptionQueue } from '../index';
import {
  downloadFile,
  uploadFile,
  getAudioKey,
  getThumbnailKey,
  getPresignedDownloadUrl,
} from '../../services/storage.service';
import { updateSource } from '../../db/tenant-queries';
import { logger } from '../../logger';
import { extractVideoThumbnail, killThumbnailProcess } from '../../services/thumbnail.service';

// Track active FFmpeg processes for graceful shutdown
let activeProcess: ChildProcess | null = null;
const log = logger.child({ worker: 'audio-extraction' });

/**
 * Audio Extraction Worker
 *
 * Runs for ALL video files regardless of AI provider.
 * Standardized workflow: FFmpeg extracts audio, then AI transcribes audio.
 *
 * Flow:
 * 1. Download video from S3
 * 2. Extract audio using FFmpeg (16kHz mono WAV)
 * 3. Upload audio to S3
 * 4. Queue transcription job with audio file
 */
async function processJob(job: Job<AudioExtractionJobData>): Promise<void> {
  const startTime = Date.now();

  // Validate job data with Zod
  const data = audioExtractionJobSchema.parse(job.data);
  const { sourceId, videoUrl, schemaName } = data;

  const jobLog = log.child({ jobId: job.id, sourceId, schemaName });
  jobLog.info('Starting audio extraction');

  // Create temp directory for processing
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openinsights-'));
  const inputPath = path.join(tempDir, 'input.video');
  const outputPath = path.join(tempDir, 'audio.mp3');
  const thumbnailPath = path.join(tempDir, 'thumbnail.jpg');

  try {
    // Update source status to PROCESSING
    await updateSource(schemaName, sourceId, { status: 'PROCESSING' });

    // Download video from S3
    jobLog.info('Downloading video from S3');
    await job.updateProgress(10);

    const videoBuffer = await downloadFile(getSourceKeyFromUrl(videoUrl, sourceId));
    await fs.writeFile(inputPath, videoBuffer);

    jobLog.info({ inputSize: videoBuffer.length }, 'Video downloaded');
    await job.updateProgress(20);

    // Extract video thumbnail (frame at 1 second)
    jobLog.info('Extracting video thumbnail');
    try {
      await extractVideoThumbnail(inputPath, thumbnailPath);

      // Upload thumbnail to S3
      const thumbnailBuffer = await fs.readFile(thumbnailPath);
      const thumbnailKey = getThumbnailKey(sourceId);
      await uploadFile(thumbnailKey, thumbnailBuffer, { contentType: 'image/jpeg' });

      // Store S3 key (not presigned URL) - URLs are generated on-demand in API layer
      await updateSource(schemaName, sourceId, { thumbnailUrl: thumbnailKey });
      jobLog.info({ thumbnailKey }, 'Thumbnail extracted and uploaded');
    } catch (thumbnailError) {
      // Thumbnail extraction failure is non-fatal - log and continue
      jobLog.warn(
        { error: thumbnailError },
        'Thumbnail extraction failed, continuing without thumbnail'
      );
    }

    await job.updateProgress(30);

    // Extract audio using FFmpeg
    // Settings optimized for Whisper:
    // - 16kHz sample rate
    // - Mono channel
    // - MP3 format (compressed, ~10-20x smaller than WAV)
    jobLog.info('Extracting audio with FFmpeg');

    const ffmpegCommand = [
      'ffmpeg',
      '-i',
      `"${inputPath}"`,
      '-vn', // No video
      '-acodec',
      'libmp3lame', // MP3 codec
      '-b:a',
      '64k', // 64kbps bitrate (good for speech)
      '-ar',
      '16000', // 16kHz sample rate
      '-ac',
      '1', // Mono
      '-y', // Overwrite
      `"${outputPath}"`,
    ].join(' ');

    await new Promise<void>((resolve, reject) => {
      activeProcess = exec(ffmpegCommand, { timeout: 300000 }, (error, stdout, stderr) => {
        activeProcess = null;

        if (error) {
          jobLog.error({ error, stderr }, 'FFmpeg extraction failed');
          reject(new Error(`FFmpeg failed: ${stderr || error.message}`));
        } else {
          resolve();
        }
      });
    });

    await job.updateProgress(70);

    // Read extracted audio
    const audioBuffer = await fs.readFile(outputPath);
    jobLog.info({ audioSize: audioBuffer.length }, 'Audio extracted');

    // Upload audio to S3
    jobLog.info('Uploading audio to S3');
    const audioKey = getAudioKey(sourceId);
    await uploadFile(audioKey, audioBuffer, { contentType: 'audio/mpeg' });

    await job.updateProgress(90);

    // Get presigned URL for transcription worker
    const audioUrl = await getPresignedDownloadUrl(audioKey, 3600);

    // Queue transcription job
    await transcriptionQueue.add(
      'transcription',
      {
        sourceId,
        fileUrl: audioUrl,
        fileType: 'audio' as const,
        schemaName,
      },
      { jobId: `transcription-${sourceId}` }
    );

    const duration = Date.now() - startTime;
    jobLog.info({ duration }, 'Audio extraction complete, transcription queued');
    await job.updateProgress(100);
  } catch (error) {
    jobLog.error({ error }, 'Audio extraction failed');

    // Update source status to FAILED
    await updateSource(schemaName, sourceId, { status: 'FAILED' });

    throw error;
  } finally {
    // Cleanup temp files
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  }
}

/**
 * Extract S3 key from URL or construct it
 */
function getSourceKeyFromUrl(url: string, sourceId: string): string {
  // If it's a presigned URL, extract the key
  try {
    const parsed = new URL(url);
    const pathParts = parsed.pathname.split('/').filter(Boolean);
    // Remove bucket name from path and decode URI components
    const key = pathParts.slice(1).join('/');
    return decodeURIComponent(key);
  } catch {
    // Fallback: assume it's already a key pattern
    return `sources/${sourceId}/original`;
  }
}

// Create the worker
const concurrency = parseInt(process.env.WORKER_CONCURRENCY || '2', 10);

export const audioExtractionWorker = new Worker<AudioExtractionJobData>(
  QueueName.AUDIO_EXTRACTION,
  processJob,
  {
    connection: connectionOptions,
    concurrency,
  }
);

// Event handlers
audioExtractionWorker.on('completed', (job) => {
  log.info({ jobId: job.id, sourceId: job.data.sourceId }, 'Job completed');
});

audioExtractionWorker.on('failed', (job, error) => {
  log.error({ jobId: job?.id, sourceId: job?.data.sourceId, error }, 'Job failed');
  // Note: FAILED status is set in processJob catch block, not here
  // This avoids race conditions and duplicate DB updates
});

audioExtractionWorker.on('error', (error) => {
  log.error({ error }, 'Worker error');
});

// Graceful shutdown
export async function shutdownAudioExtractionWorker(): Promise<void> {
  log.info('Shutting down audio extraction worker');

  // Kill active FFmpeg process
  if (activeProcess) {
    activeProcess.kill('SIGKILL');
    activeProcess = null;
  }

  // Kill active thumbnail process
  killThumbnailProcess();

  await audioExtractionWorker.close();
  log.info('Audio extraction worker shut down');
}
