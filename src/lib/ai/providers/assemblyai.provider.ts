import { AssemblyAI, TranscriptUtterance } from 'assemblyai';
import { AIProvider, TranscriptionInput, TranscriptionResult, EmbeddingResult } from '../types';
import { logger } from '../../logger';

export interface AssemblyAIProviderOptions {
  apiKey?: string | null;
}

/**
 * AssemblyAI provider for speech-to-text transcription.
 *
 * Features:
 * - High-accuracy speaker diarization (2.9% error rate)
 * - Excellent performance in noisy environments
 * - Automatic punctuation and formatting
 *
 * NOTE: This provider only supports transcription. Use OpenAI or Gemini
 * for embeddings and text generation.
 */
export class AssemblyAIProvider implements AIProvider {
  readonly name = 'assemblyai';
  private client: AssemblyAI;
  private log = logger.child({ provider: 'assemblyai' });

  constructor(options?: AssemblyAIProviderOptions) {
    const apiKey = options?.apiKey || process.env.ASSEMBLYAI_API_KEY;
    if (!apiKey) {
      throw new Error(
        'AssemblyAI API key is required. Please configure it in Settings or set ASSEMBLYAI_API_KEY environment variable.'
      );
    }

    this.client = new AssemblyAI({ apiKey });
    this.log.info('AssemblyAI provider initialized');
  }

  supportsVideoInput(): boolean {
    return false; // AssemblyAI requires audio
  }

  async transcribe(input: TranscriptionInput): Promise<TranscriptionResult> {
    if (input.fileType === 'video') {
      throw new Error(
        'AssemblyAI transcription does not support video input. Extract audio first.'
      );
    }

    this.log.info(
      { sourceId: input.sourceId, language: input.language },
      'Starting AssemblyAI transcription'
    );

    try {
      // Fetch the audio file from presigned URL (needed for local MinIO)
      // AssemblyAI can't access localhost URLs, so we upload the file to AssemblyAI first
      this.log.debug({ sourceId: input.sourceId }, 'Fetching audio from presigned URL');
      const audioResponse = await fetch(input.fileUrl);
      if (!audioResponse.ok) {
        throw new Error(
          `Failed to fetch audio: ${audioResponse.status} ${audioResponse.statusText}`
        );
      }
      const audioBuffer = Buffer.from(await audioResponse.arrayBuffer());
      const audioSizeMB = (audioBuffer.length / (1024 * 1024)).toFixed(2);
      this.log.debug(
        { sourceId: input.sourceId, audioSize: `${audioSizeMB} MB` },
        'Audio fetched, uploading to AssemblyAI'
      );

      // Upload to AssemblyAI (they host it temporarily for transcription)
      const uploadUrl = await this.client.files.upload(audioBuffer);
      this.log.debug({ sourceId: input.sourceId }, 'Audio uploaded to AssemblyAI');

      // Request transcription with speaker diarization
      const transcript = await this.client.transcripts.transcribe({
        audio: uploadUrl,
        language_code: input.language || 'en', // Use provided language or default to English
        speaker_labels: true,
      });

      // Check for transcription errors
      if (transcript.status === 'error') {
        throw new Error(`AssemblyAI transcription failed: ${transcript.error}`);
      }

      // Process utterances into segments with speaker info
      const utterances: TranscriptUtterance[] = transcript.utterances || [];
      const segments = utterances.map((utterance) => ({
        startTime: utterance.start / 1000, // Convert ms to seconds
        endTime: utterance.end / 1000, // Convert ms to seconds
        content: utterance.text.trim(),
        speakerId: utterance.speaker ? `speaker_${utterance.speaker}` : undefined,
      }));

      // Calculate total duration from transcript audio_duration (in seconds)
      const duration = transcript.audio_duration || 0;

      // Get detected language
      const language = transcript.language_code || undefined;

      this.log.info(
        {
          sourceId: input.sourceId,
          segmentCount: segments.length,
          duration,
          language,
        },
        'AssemblyAI transcription complete'
      );

      return {
        segments,
        duration,
        language,
      };
    } catch (error) {
      this.log.error({ error, sourceId: input.sourceId }, 'AssemblyAI transcription failed');
      throw error;
    }
  }

  async embed(_texts: string[]): Promise<EmbeddingResult> {
    throw new Error(
      'AssemblyAI does not support embeddings. Use OpenAI, Gemini, or Ollama for embedding generation.'
    );
  }

  // AssemblyAI does not support text generation
  // generateText is intentionally not implemented
}
