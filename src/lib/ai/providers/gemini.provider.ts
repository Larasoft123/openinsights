import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  AIProvider,
  TranscriptionInput,
  TranscriptionResult,
  EmbeddingResult,
  TextGenerationOptions,
} from '../types';
import { logger } from '../../logger';

const DEFAULT_EMBEDDING_MODEL = 'text-embedding-004';
const DEFAULT_TEXT_GENERATION_MODEL = 'gemini-2.5-flash';

export interface GeminiProviderOptions {
  apiKey?: string | null;
  embeddingModel?: string | null;
  textGenerationModel?: string | null;
}

/**
 * Gemini provider for embeddings and text generation.
 *
 * NOTE: Gemini transcription has been removed due to inaccurate timestamps (Issue #23).
 * Use Deepgram, AssemblyAI, OpenAI Whisper, or WhisperX for transcription instead.
 */
export class GeminiProvider implements AIProvider {
  readonly name = 'gemini';
  private client: GoogleGenerativeAI;
  private log = logger.child({ provider: 'gemini' });
  private embeddingModel: string;
  private textGenerationModel: string;

  /**
   * @param options - Optional overrides from organization settings
   *        apiKey: Organization API key (falls back to env var)
   *        embeddingModel: Embedding model (falls back to default)
   *        textGenerationModel: Text generation model (falls back to default)
   */
  constructor(options?: GeminiProviderOptions) {
    // Priority for API key: organization config > env var
    const apiKey = options?.apiKey || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      throw new Error(
        'Gemini API key is required. Please configure it in Settings or set GOOGLE_GENERATIVE_AI_API_KEY environment variable.'
      );
    }

    this.client = new GoogleGenerativeAI(apiKey);

    // Model selection: config > default
    this.embeddingModel = options?.embeddingModel || DEFAULT_EMBEDDING_MODEL;
    this.textGenerationModel = options?.textGenerationModel || DEFAULT_TEXT_GENERATION_MODEL;

    this.log.info(
      { embeddingModel: this.embeddingModel, textGenerationModel: this.textGenerationModel },
      'Gemini provider initialized'
    );
  }

  supportsVideoInput(): boolean {
    return false;
  }

  /**
   * Gemini transcription is not supported.
   * Use Deepgram, AssemblyAI, OpenAI Whisper, or WhisperX instead.
   *
   * @throws Error always - Gemini should not be used for transcription
   */
  async transcribe(_input: TranscriptionInput): Promise<TranscriptionResult> {
    throw new Error(
      'Gemini transcription is not supported due to inaccurate timestamps. ' +
        'Please configure a dedicated transcription provider (Deepgram, AssemblyAI, OpenAI, or WhisperX) in Settings.'
    );
  }

  async embed(texts: string[]): Promise<EmbeddingResult> {
    if (texts.length === 0) {
      return { embeddings: [], model: this.embeddingModel, dimensions: 768 };
    }

    this.log.info({ textCount: texts.length, model: this.embeddingModel }, 'Generating embeddings');

    try {
      const model = this.client.getGenerativeModel({ model: this.embeddingModel });

      // Gemini embeds one text at a time
      const embeddings: number[][] = [];

      for (const text of texts) {
        const result = await model.embedContent(text);
        embeddings.push(result.embedding.values);
      }

      this.log.info({ textCount: texts.length }, 'Embeddings generated');

      return {
        embeddings,
        model: this.embeddingModel,
        dimensions: embeddings[0]?.length || 768,
      };
    } catch (error) {
      this.log.error({ error }, 'Embedding generation failed');
      throw error;
    }
  }

  async generateText(prompt: string, options?: TextGenerationOptions): Promise<string> {
    const temperature = options?.temperature ?? 0.7;
    this.log.info(
      { promptLength: prompt.length, model: this.textGenerationModel, temperature },
      'Generating text'
    );

    try {
      const model = this.client.getGenerativeModel({
        model: this.textGenerationModel,
        generationConfig: {
          temperature: temperature,
        },
      });

      const result = await model.generateContent(prompt);
      const text = result.response.text();

      this.log.info({ responseLength: text.length }, 'Text generated');

      return text;
    } catch (error) {
      this.log.error({ error }, 'Text generation failed');
      throw error;
    }
  }
}
