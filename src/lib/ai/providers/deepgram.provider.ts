import { createClient, DeepgramClient } from '@deepgram/sdk';
import { AIProvider, TranscriptionInput, TranscriptionResult, EmbeddingResult } from '../types';
import { logger } from '../../logger';

// Nova-3 is Deepgram's latest and most accurate model
const DEFAULT_TRANSCRIPTION_MODEL = 'nova-3';

export interface DeepgramProviderOptions {
  apiKey?: string | null;
  transcriptionModel?: string | null;
}

/**
 * Deepgram provider for speech-to-text transcription.
 *
 * Features:
 * - Native speaker diarization with high accuracy
 * - Excellent timestamp precision
 * - Fast processing times
 *
 * NOTE: This provider only supports transcription. Use OpenAI or Gemini
 * for embeddings and text generation.
 */
export class DeepgramProvider implements AIProvider {
  readonly name = 'deepgram';
  private client: DeepgramClient;
  private log = logger.child({ provider: 'deepgram' });
  private transcriptionModel: string;

  constructor(options?: DeepgramProviderOptions) {
    const apiKey = options?.apiKey || process.env.DEEPGRAM_API_KEY;
    if (!apiKey) {
      throw new Error(
        'Deepgram API key is required. Please configure it in Settings or set DEEPGRAM_API_KEY environment variable.'
      );
    }

    this.client = createClient(apiKey);
    this.transcriptionModel = options?.transcriptionModel || DEFAULT_TRANSCRIPTION_MODEL;
    this.log.info({ model: this.transcriptionModel }, 'Deepgram provider initialized');
  }

  supportsVideoInput(): boolean {
    return false; // Deepgram requires audio
  }

  async transcribe(input: TranscriptionInput): Promise<TranscriptionResult> {
    if (input.fileType === 'video') {
      throw new Error('Deepgram transcription does not support video input. Extract audio first.');
    }

    this.log.info({ sourceId: input.sourceId }, 'Starting Deepgram transcription');

    try {
      // Fetch the audio file from presigned URL (needed for local MinIO)
      // Deepgram's transcribeUrl won't work with localhost URLs
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
        'Audio fetched, sending to Deepgram'
      );

      // Send audio bytes directly to Deepgram
      const { result } = await this.client.listen.prerecorded.transcribeFile(audioBuffer, {
        model: this.transcriptionModel,
        smart_format: true,
        diarize: true,
        utterances: true,
        punctuate: true,
        mimetype: 'audio/mpeg',
      });

      // Process utterances into segments with speaker info
      const utterances = result?.results?.utterances || [];
      const segments = utterances.map((utterance) => ({
        startTime: utterance.start,
        endTime: utterance.end,
        content: utterance.transcript.trim(),
        speakerId: utterance.speaker !== undefined ? `speaker_${utterance.speaker}` : undefined,
      }));

      // Calculate total duration from metadata or last segment
      const duration =
        result?.metadata?.duration ||
        (segments.length > 0 ? segments[segments.length - 1].endTime : 0);

      // Get detected language
      const language = result?.results?.channels?.[0]?.detected_language;

      this.log.info(
        {
          sourceId: input.sourceId,
          segmentCount: segments.length,
          duration,
          language,
        },
        'Deepgram transcription complete'
      );

      return {
        segments,
        duration,
        language,
      };
    } catch (error) {
      this.log.error({ error, sourceId: input.sourceId }, 'Deepgram transcription failed');
      throw error;
    }
  }

  async embed(_texts: string[]): Promise<EmbeddingResult> {
    throw new Error(
      'Deepgram does not support embeddings. Use OpenAI, Gemini, or Ollama for embedding generation.'
    );
  }

  // Deepgram does not support text generation
  // generateText is intentionally not implemented
}
