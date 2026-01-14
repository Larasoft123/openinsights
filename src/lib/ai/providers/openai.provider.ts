import OpenAI from 'openai';
import {
  AIProvider,
  TranscriptionInput,
  TranscriptionResult,
  EmbeddingResult,
  TextGenerationOptions,
} from '../types';
import { logger } from '../../logger';

const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMENSIONS = 1536;

// Map MIME types to file extensions for OpenAI Whisper API
const AUDIO_MIME_TO_EXT: Record<string, string> = {
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/wav': 'wav',
  'audio/wave': 'wav',
  'audio/x-wav': 'wav',
  'audio/mp4': 'm4a',
  'audio/m4a': 'm4a',
  'audio/x-m4a': 'm4a',
  'audio/ogg': 'ogg',
  'audio/webm': 'webm',
  'audio/flac': 'flac',
};

// Supported transcription models:
// - whisper-1: Classic model, supports verbose_json with segment timestamps
// - gpt-4o-transcribe-diarize: New model with speaker diarization
type TranscriptionModel = 'whisper-1' | 'gpt-4o-transcribe-diarize';

const DEFAULT_TRANSCRIPTION_MODEL: TranscriptionModel = 'whisper-1';

// Diarized response structure from gpt-4o-transcribe-diarize
interface DiarizedSegment {
  speaker: string;
  text: string;
  start: number;
  end: number;
}

interface DiarizedResponse {
  text: string;
  segments: DiarizedSegment[];
}

export interface OpenAIProviderOptions {
  apiKey?: string | null;
  transcriptionModel?: TranscriptionModel | null;
  embeddingModel?: string | null;
  textGenerationModel?: string | null;
}

export class OpenAIProvider implements AIProvider {
  readonly name = 'openai';
  private client: OpenAI;
  private log = logger.child({ provider: 'openai' });
  private transcriptionModel: TranscriptionModel;
  private embeddingModel: string;
  private textGenerationModel: string;

  /**
   * @param options - Optional overrides from organization settings
   *        apiKey: Organization API key (falls back to env var)
   *        transcriptionModel: Transcription model (falls back to env var then default)
   *        embeddingModel: Embedding model (falls back to default)
   *        textGenerationModel: Text generation model (falls back to default)
   */
  constructor(options?: OpenAIProviderOptions) {
    // Priority for API key: organization config > env var
    const apiKey = options?.apiKey || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error(
        'OpenAI API key is required. Please configure it in Settings or set OPENAI_API_KEY environment variable.'
      );
    }

    this.client = new OpenAI({ apiKey });

    // Transcription model: config > env var > default
    if (options?.transcriptionModel) {
      this.transcriptionModel = options.transcriptionModel;
    } else {
      const envModel = process.env.OPENAI_TRANSCRIPTION_MODEL;
      if (envModel === 'whisper-1' || envModel === 'gpt-4o-transcribe-diarize') {
        this.transcriptionModel = envModel;
      } else {
        this.transcriptionModel = DEFAULT_TRANSCRIPTION_MODEL;
      }
    }

    // Embedding model: config > default
    this.embeddingModel = options?.embeddingModel || EMBEDDING_MODEL;

    // Text generation model: config > default
    this.textGenerationModel = options?.textGenerationModel || 'gpt-4o-mini';

    this.log.info(
      {
        transcriptionModel: this.transcriptionModel,
        embeddingModel: this.embeddingModel,
        textGenerationModel: this.textGenerationModel,
      },
      'OpenAI provider initialized'
    );
  }

  supportsVideoInput(): boolean {
    return false; // OpenAI transcription requires audio
  }

  async transcribe(input: TranscriptionInput): Promise<TranscriptionResult> {
    if (input.fileType === 'video') {
      throw new Error('OpenAI transcription does not support video input. Extract audio first.');
    }

    this.log.info(
      { sourceId: input.sourceId, model: this.transcriptionModel, language: input.language },
      'Starting transcription'
    );

    try {
      // Fetch audio file from URL
      const response = await fetch(input.fileUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch audio: ${response.status}`);
      }

      // Get actual content type from response (S3/MinIO sets this correctly)
      const contentType = response.headers.get('content-type') || 'audio/mpeg';
      const mimeType = contentType.split(';')[0].trim(); // Remove charset if present
      const extension = AUDIO_MIME_TO_EXT[mimeType] || 'mp3';

      const audioBuffer = await response.arrayBuffer();
      const audioFile = new File([audioBuffer], `audio.${extension}`, { type: mimeType });

      const audioSizeMB = (audioBuffer.byteLength / (1024 * 1024)).toFixed(2);
      this.log.debug(
        { mimeType, extension, audioSize: `${audioSizeMB} MB` },
        'Detected audio format'
      );

      // Route to appropriate transcription method based on model
      if (this.transcriptionModel === 'gpt-4o-transcribe-diarize') {
        return await this.transcribeWithDiarization(audioFile, input.sourceId, input.language);
      } else {
        return await this.transcribeWithWhisper(audioFile, input.sourceId, input.language);
      }
    } catch (error) {
      this.log.error({ error, sourceId: input.sourceId }, 'Transcription failed');
      throw error;
    }
  }

  /**
   * Transcribe using whisper-1 model with verbose_json format
   */
  private async transcribeWithWhisper(
    audioFile: File,
    sourceId: string,
    language?: string
  ): Promise<TranscriptionResult> {
    const result = await this.client.audio.transcriptions.create({
      model: 'whisper-1',
      file: audioFile,
      response_format: 'verbose_json',
      timestamp_granularities: ['segment'],
      language: language || undefined, // Use provided language or let Whisper auto-detect
    });

    const segments = (result.segments || []).map((seg) => ({
      startTime: seg.start,
      endTime: seg.end,
      content: seg.text.trim(),
      speakerId: undefined,
    }));

    this.log.info({ sourceId, segmentCount: segments.length }, 'Whisper transcription complete');

    return {
      segments,
      duration: result.duration || 0,
      language: result.language,
    };
  }

  /**
   * Transcribe using gpt-4o-transcribe-diarize model with speaker identification
   */
  private async transcribeWithDiarization(
    audioFile: File,
    sourceId: string,
    language?: string
  ): Promise<TranscriptionResult> {
    // The SDK types don't include diarized_json yet, so we use type assertions
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const params: any = {
      model: 'gpt-4o-transcribe-diarize',
      file: audioFile,
      response_format: 'diarized_json',
      // chunking_strategy is required for audio > 30 seconds
      chunking_strategy: 'auto',
      language: language || undefined, // Use provided language or let model auto-detect
    };

    const result = (await this.client.audio.transcriptions.create(params)) as DiarizedResponse;

    const segments = (result.segments || []).map((seg) => ({
      startTime: seg.start,
      endTime: seg.end,
      content: seg.text.trim(),
      speakerId: seg.speaker || undefined,
    }));

    this.log.info({ sourceId, segmentCount: segments.length }, 'Diarized transcription complete');

    // Calculate duration from last segment
    const duration = segments.length > 0 ? segments[segments.length - 1].endTime : 0;

    return {
      segments,
      duration,
      language: undefined, // Diarize model doesn't return language
    };
  }

  async embed(texts: string[]): Promise<EmbeddingResult> {
    if (texts.length === 0) {
      return { embeddings: [], model: this.embeddingModel, dimensions: EMBEDDING_DIMENSIONS };
    }

    this.log.info({ textCount: texts.length, model: this.embeddingModel }, 'Generating embeddings');

    try {
      const result = await this.client.embeddings.create({
        model: this.embeddingModel,
        input: texts,
        dimensions: EMBEDDING_DIMENSIONS,
      });

      const embeddings = result.data.map((item) => item.embedding);

      this.log.info({ textCount: texts.length }, 'Embeddings generated');

      return {
        embeddings,
        model: this.embeddingModel,
        dimensions: EMBEDDING_DIMENSIONS,
      };
    } catch (error) {
      this.log.error({ error }, 'Embedding generation failed');
      throw error;
    }
  }

  async generateText(prompt: string, options?: TextGenerationOptions): Promise<string> {
    // Note: OpenAI audio input requires specific model configuration and is not yet
    // fully supported in this provider. Use Gemini for audio-based language detection.
    if (options?.audioData) {
      this.log.warn(
        'OpenAI provider does not support audio input for text generation. ' +
          'Use Gemini as your general AI provider for language detection.'
      );
    }

    this.log.info(
      { promptLength: prompt.length, model: this.textGenerationModel },
      'Generating text'
    );

    try {
      const response = await this.client.chat.completions.create({
        model: this.textGenerationModel,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: options?.maxTokens ?? 150,
        temperature: options?.temperature ?? 0.7,
      });

      const text = response.choices[0]?.message?.content ?? '';

      this.log.info({ responseLength: text.length }, 'Text generated');

      return text;
    } catch (error) {
      this.log.error({ error }, 'Text generation failed');
      throw error;
    }
  }
}
