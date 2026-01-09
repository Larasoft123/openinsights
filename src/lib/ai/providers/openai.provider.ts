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
}

export class OpenAIProvider implements AIProvider {
  readonly name = 'openai';
  private client: OpenAI;
  private log = logger.child({ provider: 'openai' });
  private transcriptionModel: TranscriptionModel;

  /**
   * @param options - Optional overrides from workspace settings
   *        apiKey: Workspace API key (falls back to env var)
   *        transcriptionModel: Model override (falls back to env var then default)
   */
  constructor(options?: OpenAIProviderOptions) {
    // Priority for API key: workspace config > env var
    const apiKey = options?.apiKey || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error(
        'OpenAI API key is required. Please configure it in Settings or set OPENAI_API_KEY environment variable.'
      );
    }

    this.client = new OpenAI({ apiKey });

    // Priority for model: workspace config > env var > default
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

    this.log.info({ transcriptionModel: this.transcriptionModel }, 'OpenAI provider initialized');
  }

  supportsVideoInput(): boolean {
    return false; // OpenAI transcription requires audio
  }

  async transcribe(input: TranscriptionInput): Promise<TranscriptionResult> {
    if (input.fileType === 'video') {
      throw new Error('OpenAI transcription does not support video input. Extract audio first.');
    }

    this.log.info(
      { sourceId: input.sourceId, model: this.transcriptionModel },
      'Starting transcription'
    );

    try {
      // Fetch audio file from URL
      const response = await fetch(input.fileUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch audio: ${response.status}`);
      }

      const audioBuffer = await response.arrayBuffer();
      const audioFile = new File([audioBuffer], 'audio.wav', { type: 'audio/wav' });

      // Route to appropriate transcription method based on model
      if (this.transcriptionModel === 'gpt-4o-transcribe-diarize') {
        return await this.transcribeWithDiarization(audioFile, input.sourceId);
      } else {
        return await this.transcribeWithWhisper(audioFile, input.sourceId);
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
    sourceId: string
  ): Promise<TranscriptionResult> {
    const result = await this.client.audio.transcriptions.create({
      model: 'whisper-1',
      file: audioFile,
      response_format: 'verbose_json',
      timestamp_granularities: ['segment'],
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
    sourceId: string
  ): Promise<TranscriptionResult> {
    // The SDK types don't include diarized_json yet, so we use type assertions
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const params: any = {
      model: 'gpt-4o-transcribe-diarize',
      file: audioFile,
      response_format: 'diarized_json',
      // chunking_strategy is required for audio > 30 seconds
      chunking_strategy: 'auto',
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
      return { embeddings: [], model: EMBEDDING_MODEL, dimensions: EMBEDDING_DIMENSIONS };
    }

    this.log.info({ textCount: texts.length }, 'Generating embeddings');

    try {
      const result = await this.client.embeddings.create({
        model: EMBEDDING_MODEL,
        input: texts,
        dimensions: EMBEDDING_DIMENSIONS,
      });

      const embeddings = result.data.map((item) => item.embedding);

      this.log.info({ textCount: texts.length }, 'Embeddings generated');

      return {
        embeddings,
        model: EMBEDDING_MODEL,
        dimensions: EMBEDDING_DIMENSIONS,
      };
    } catch (error) {
      this.log.error({ error }, 'Embedding generation failed');
      throw error;
    }
  }

  async generateText(prompt: string, options?: TextGenerationOptions): Promise<string> {
    this.log.info({ promptLength: prompt.length }, 'Generating text');

    try {
      const response = await this.client.chat.completions.create({
        model: 'gpt-4o-mini',
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
