import { AIProvider, TranscriptionInput, TranscriptionResult, EmbeddingResult } from '../types';
import { logger } from '../../logger';

// Default Ollama embedding model - 768 dimensions
const DEFAULT_EMBEDDING_MODEL = 'nomic-embed-text';
const DEFAULT_OLLAMA_BASE_URL = 'http://localhost:11434';
export const OLLAMA_EMBEDDING_DIMENSIONS = 768;

export interface OllamaProviderOptions {
  baseUrl?: string | null;
}

export class OllamaProvider implements AIProvider {
  readonly name = 'ollama';
  private baseUrl: string;
  private embeddingModel: string;
  private log = logger.child({ provider: 'ollama' });

  /**
   * @param options - Optional overrides from workspace settings
   *        baseUrl: Ollama server URL (falls back to env var then default)
   */
  constructor(options?: OllamaProviderOptions) {
    // Priority for base URL: workspace config > env var > default
    this.baseUrl = options?.baseUrl || process.env.OLLAMA_BASE_URL || DEFAULT_OLLAMA_BASE_URL;
    this.embeddingModel = process.env.OLLAMA_EMBEDDING_MODEL || DEFAULT_EMBEDDING_MODEL;
  }

  supportsVideoInput(): boolean {
    return false; // Ollama doesn't support direct video transcription
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async transcribe(_input: TranscriptionInput): Promise<TranscriptionResult> {
    // Ollama doesn't support transcription - use Whisper locally or cloud provider
    throw new Error(
      'Ollama does not support transcription. Use AI_PROVIDER=gemini or AI_PROVIDER=openai for transcription, or use local Whisper.'
    );
  }

  async embed(texts: string[]): Promise<EmbeddingResult> {
    if (texts.length === 0) {
      return {
        embeddings: [],
        model: this.embeddingModel,
        dimensions: OLLAMA_EMBEDDING_DIMENSIONS,
      };
    }

    this.log.info(
      { textCount: texts.length, model: this.embeddingModel },
      'Generating embeddings via Ollama'
    );

    try {
      const embeddings: number[][] = [];

      // Ollama embeds one text at a time
      for (const text of texts) {
        const response = await fetch(`${this.baseUrl}/api/embeddings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: this.embeddingModel,
            prompt: text,
          }),
        });

        if (!response.ok) {
          const error = await response.text();
          throw new Error(`Ollama embedding failed: ${response.status} - ${error}`);
        }

        const result = (await response.json()) as { embedding: number[] };
        embeddings.push(result.embedding);
      }

      this.log.info({ textCount: texts.length }, 'Ollama embeddings generated');

      return {
        embeddings,
        model: this.embeddingModel,
        dimensions: embeddings[0]?.length || OLLAMA_EMBEDDING_DIMENSIONS,
      };
    } catch (error) {
      this.log.error({ error }, 'Ollama embedding generation failed');
      throw error;
    }
  }
}
