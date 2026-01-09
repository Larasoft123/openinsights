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
  getPresignedDownloadUrl,
} from '../../services/storage.service';
import { prisma } from '../../db';
import { logger } from '../../logger';

// Track active FFmpeg processes for graceful shutdown
let activeProcess: ChildProcess | null = null;
const log = logger.child({ worker: 'audio-extraction' });

/**
 * Audio Extraction Worker
 *
 * Only runs when AI_PROVIDER=openai (OpenAI Whisper requires audio input)
 * Gemini provider skips this worker entirely (native video support)
 *
 * Flow:
 * 1. Download video from S3
 * 2. Extract audio using FFmpeg (16kHz mono WAV for Whisper)
 * 3. Upload audio to S3
 * 4. Queue transcription job
 */
async function processJob(job: Job<AudioExtractionJobData>): Promise<void> {
  const startTime = Date.now();

  // Validate job data with Zod
  const data = audioExtractionJobSchema.parse(job.data);
  const { sourceId, videoUrl } = data;

  const jobLog = log.child({ jobId: job.id, sourceId });
  jobLog.info('Starting audio extraction');

  // Create temp directory for processing
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openinsights-'));
  const inputPath = path.join(tempDir, 'input.video');
  const outputPath = path.join(tempDir, 'audio.wav');

  try {
    // Update source status to PROCESSING
    await prisma.source.update({
      where: { id: sourceId },
      data: { status: 'PROCESSING' },
    });

    // Download video from S3
    jobLog.info('Downloading video from S3');
    await job.updateProgress(10);

    const videoBuffer = await downloadFile(getSourceKeyFromUrl(videoUrl, sourceId));
    await fs.writeFile(inputPath, videoBuffer);

    jobLog.info({ inputSize: videoBuffer.length }, 'Video downloaded');
    await job.updateProgress(30);

    // Extract audio using FFmpeg
    // Settings optimized for Whisper:
    // - 16kHz sample rate
    // - Mono channel
    // - WAV format (uncompressed)
    jobLog.info('Extracting audio with FFmpeg');

    const ffmpegCommand = [
      'ffmpeg',
      '-i',
      `"${inputPath}"`,
      '-vn', // No video
      '-acodec',
      'pcm_s16le', // 16-bit PCM
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
    await uploadFile(audioKey, audioBuffer, { contentType: 'audio/wav' });

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
      },
      { jobId: `transcription-${sourceId}` }
    );

    const duration = Date.now() - startTime;
    jobLog.info({ duration }, 'Audio extraction complete, transcription queued');
    await job.updateProgress(100);
  } catch (error) {
    jobLog.error({ error }, 'Audio extraction failed');

    // Update source status to FAILED
    await prisma.source.update({
      where: { id: sourceId },
      data: { status: 'FAILED' },
    });

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

  await audioExtractionWorker.close();
  log.info('Audio extraction worker shut down');
}
