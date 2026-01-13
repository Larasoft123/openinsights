import { execSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { logger } from '../logger';
import { getGeneralAIProvider } from '../ai/provider';
import { OrganizationAIConfig } from '../ai/types';
import { SUPPORTED_LANGUAGES, LANGUAGE_AUTO } from '../constants/languages';

const log = logger.child({ service: 'language-detection' });

/** Duration of audio sample to extract for language detection (seconds) */
const SAMPLE_DURATION_SECONDS = 30;

/** Language detection prompt */
const LANGUAGE_DETECTION_PROMPT = `Listen to this audio and identify the language being spoken.
Return ONLY the ISO 639-1 two-letter language code (e.g., en, ru, es, de, fr, ja, ko, zh).
If you cannot determine the language or the audio is unclear, return "unknown".
Do not include any other text, just the language code.`;

/**
 * Detect the language of an audio file using AI.
 *
 * @param audioUrl - Presigned URL to the audio file
 * @param orgConfig - Organization AI configuration
 * @returns Detected language code (ISO 639-1) or null if detection fails
 */
export async function detectLanguage(
  audioUrl: string,
  orgConfig: OrganizationAIConfig
): Promise<string | null> {
  const tempDir = path.join(os.tmpdir(), `lang-detect-${Date.now()}`);
  const inputFile = path.join(tempDir, 'input.audio');
  const sampleFile = path.join(tempDir, 'sample.mp3');

  try {
    log.info('Starting language detection');

    // Create temp directory
    fs.mkdirSync(tempDir, { recursive: true });

    // Download audio file
    log.debug('Downloading audio file');
    const response = await fetch(audioUrl);
    if (!response.ok) {
      throw new Error(`Failed to download audio: ${response.status} ${response.statusText}`);
    }
    const audioBuffer = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(inputFile, audioBuffer);
    log.debug({ fileSize: audioBuffer.length }, 'Audio downloaded');

    // Extract first N seconds using ffmpeg
    log.debug({ duration: SAMPLE_DURATION_SECONDS }, 'Extracting audio sample');
    try {
      execSync(
        `ffmpeg -i "${inputFile}" -t ${SAMPLE_DURATION_SECONDS} -vn -acodec libmp3lame -ar 16000 -ac 1 -b:a 64k "${sampleFile}" -y 2>/dev/null`,
        { stdio: 'pipe' }
      );
    } catch (ffmpegError) {
      log.warn({ error: ffmpegError }, 'FFmpeg extraction failed, using original file');
      // If ffmpeg fails, try using the original file (might be too large for API)
      fs.copyFileSync(inputFile, sampleFile);
    }

    // Check if sample file exists and has content
    if (!fs.existsSync(sampleFile)) {
      log.error('Sample file not created');
      return null;
    }

    const sampleStats = fs.statSync(sampleFile);
    if (sampleStats.size === 0) {
      log.error('Sample file is empty');
      return null;
    }
    log.debug({ sampleSize: sampleStats.size }, 'Audio sample extracted');

    // Convert to base64
    const sampleBuffer = fs.readFileSync(sampleFile);
    const base64Audio = sampleBuffer.toString('base64');

    // Get AI provider and detect language
    const provider = getGeneralAIProvider(orgConfig);

    if (!provider.generateText) {
      log.warn('AI provider does not support text generation');
      return null;
    }

    log.debug({ provider: provider.name }, 'Sending audio to AI for language detection');

    const result = await provider.generateText(LANGUAGE_DETECTION_PROMPT, {
      temperature: 0.1, // Low temperature for more deterministic output
      audioData: {
        data: base64Audio,
        mimeType: 'audio/mpeg',
      },
    });

    // Parse the result - should be just a language code
    const detectedCode = result.trim().toLowerCase();

    // Validate the detected code
    if (detectedCode === 'unknown') {
      log.info('Language detection returned unknown');
      return null;
    }

    // Check if it's a valid supported language code
    const isValid = SUPPORTED_LANGUAGES.some((lang) => lang.code === detectedCode);
    if (!isValid) {
      log.warn({ detectedCode }, 'Detected language code not in supported list');
      // Still return it - the transcription provider might support it
    }

    log.info({ detectedLanguage: detectedCode }, 'Language detected successfully');
    return detectedCode;
  } catch (error) {
    log.error({ error }, 'Language detection failed');
    return null;
  } finally {
    // Cleanup temp files
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    } catch {
      // Ignore cleanup errors
    }
  }
}

/**
 * Get the effective language for transcription.
 *
 * Resolution order:
 * 1. Source language (if not 'auto')
 * 2. Auto-detected language (if source language is 'auto')
 * 3. Project language as fallback
 *
 * @param sourceLanguage - Language setting on the source
 * @param projectLanguage - Language setting on the project
 * @param audioUrl - Presigned URL to the audio file
 * @param orgConfig - Organization AI configuration
 * @returns Object with effective language and whether it was detected
 */
export async function getEffectiveLanguage(
  sourceLanguage: string,
  projectLanguage: string,
  audioUrl: string,
  orgConfig: OrganizationAIConfig
): Promise<{ language: string; detected: boolean }> {
  // If source has explicit language, use it
  if (sourceLanguage !== LANGUAGE_AUTO) {
    return { language: sourceLanguage, detected: false };
  }

  // Try to detect language
  const detected = await detectLanguage(audioUrl, orgConfig);
  if (detected) {
    return { language: detected, detected: true };
  }

  // Fallback to project language
  log.info({ fallback: projectLanguage }, 'Using project language as fallback');
  return { language: projectLanguage, detected: false };
}
