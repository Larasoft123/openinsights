import { exec, ChildProcess } from 'child_process';
import { logger } from '../logger';

const log = logger.child({ service: 'thumbnail' });

// Track active FFmpeg processes for graceful shutdown
let activeThumbnailProcess: ChildProcess | null = null;

/**
 * Extract a video thumbnail (frame at 1 second or 10% into video)
 * Output: JPEG image at 640x360 resolution
 */
export async function extractVideoThumbnail(inputPath: string, outputPath: string): Promise<void> {
  const thumbnailLog = log.child({ operation: 'extractVideoThumbnail', inputPath });
  thumbnailLog.info('Extracting video thumbnail');

  // FFmpeg command to extract a single frame at 1 second
  // -ss 00:00:01: Seek to 1 second
  // -vframes 1: Extract only 1 frame
  // -vf scale=640:360: Scale to 640x360 (16:9 aspect ratio)
  // -q:v 2: High quality JPEG (1-31, lower is better)
  const ffmpegCommand = [
    'ffmpeg',
    '-ss',
    '00:00:01', // Seek to 1 second
    '-i',
    `"${inputPath}"`,
    '-vframes',
    '1', // Extract 1 frame
    '-vf',
    'scale=640:360:force_original_aspect_ratio=decrease,pad=640:360:(ow-iw)/2:(oh-ih)/2',
    '-q:v',
    '2', // High quality JPEG
    '-y', // Overwrite
    `"${outputPath}"`,
  ].join(' ');

  return new Promise<void>((resolve, reject) => {
    activeThumbnailProcess = exec(ffmpegCommand, { timeout: 30000 }, (error, _stdout, stderr) => {
      activeThumbnailProcess = null;

      if (error) {
        thumbnailLog.error({ error, stderr }, 'Video thumbnail extraction failed');
        reject(new Error(`FFmpeg thumbnail extraction failed: ${stderr || error.message}`));
      } else {
        thumbnailLog.info('Video thumbnail extracted successfully');
        resolve();
      }
    });
  });
}

/**
 * Generate an audio waveform visualization image
 * Output: JPEG image at 640x360 resolution with white waveform on transparent/dark background
 */
export async function generateAudioWaveform(inputPath: string, outputPath: string): Promise<void> {
  const waveformLog = log.child({ operation: 'generateAudioWaveform', inputPath });
  waveformLog.info('Generating audio waveform');

  // FFmpeg command to generate waveform visualization
  // showwavespic: Generate waveform image from audio
  // s=640x360: Output size matching video thumbnail dimensions
  // colors=4f46e5: Indigo color for waveform (matches UI theme)
  const ffmpegCommand = [
    'ffmpeg',
    '-i',
    `"${inputPath}"`,
    '-filter_complex',
    '"showwavespic=s=640x360:colors=#4f46e5"',
    '-frames:v',
    '1',
    '-y', // Overwrite
    `"${outputPath}"`,
  ].join(' ');

  return new Promise<void>((resolve, reject) => {
    activeThumbnailProcess = exec(
      ffmpegCommand,
      { timeout: 60000 }, // Longer timeout for audio processing
      (error, _stdout, stderr) => {
        activeThumbnailProcess = null;

        if (error) {
          waveformLog.error({ error, stderr }, 'Audio waveform generation failed');
          reject(new Error(`FFmpeg waveform generation failed: ${stderr || error.message}`));
        } else {
          waveformLog.info('Audio waveform generated successfully');
          resolve();
        }
      }
    );
  });
}

/**
 * Kill active thumbnail generation process (for graceful shutdown)
 */
export function killThumbnailProcess(): void {
  if (activeThumbnailProcess) {
    activeThumbnailProcess.kill('SIGKILL');
    activeThumbnailProcess = null;
    log.info('Thumbnail process killed');
  }
}
