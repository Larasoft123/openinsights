import type { AIProvider, GeneralAIProviderType, OrganizationAIConfig } from './types';
import { logger } from '../logger';
import { GeminiProvider } from './providers/gemini.provider';
import { OpenAIProvider } from './providers/openai.provider';
import { OllamaProvider, OLLAMA_EMBEDDING_DIMENSIONS } from './providers/ollama.provider';
import { DeepgramProvider } from './providers/deepgram.provider';
import { AssemblyAIProvider } from './providers/assemblyai.provider';
import { WhisperXProvider } from './providers/whisperx.provider';

// ============================================
// Embedding Constants
// ============================================

/**
 * Ollama is the only embedding provider.
 * All embeddings are 768 dimensions (nomic-embed-text).
 */
export const EMBEDDING_DIMENSION = OLLAMA_EMBEDDING_DIMENSIONS; // 768

// ============================================
// Transcription Provider
// ============================================

/**
 * Get transcription provider based on Organization config
 *
 * Supported providers:
 * - deepgram: Native diarization, excellent accuracy (default)
 * - assemblyai: High-accuracy diarization
 * - openai: Whisper-1 or gpt-4o-transcribe-diarize
 * - whisperx: Self-hosted with pyannote diarization
 *
 * @throws Error if provider is not configured or missing API key
 */
export function getTranscriptionProvider(config: OrganizationAIConfig): AIProvider {
  const providerType = config.transcriptionProvider || 'deepgram';

  logger.info(
    { provider: providerType, model: config.transcriptionModel },
    'Creating transcription provider'
  );

  switch (providerType) {
    case 'deepgram':
      return new DeepgramProvider({
        apiKey: config.deepgramApiKey,
        transcriptionModel: config.transcriptionModel,
      });

    case 'assemblyai':
      return new AssemblyAIProvider({ apiKey: config.assemblyaiApiKey });

    case 'openai':
      return new OpenAIProvider({
        apiKey: config.openaiApiKey,
        transcriptionModel: config.transcriptionModel as 'whisper-1' | 'gpt-4o-transcribe-diarize',
      });

    case 'whisperx':
      return new WhisperXProvider({
        endpoint: config.whisperxEndpoint,
        transcriptionModel: config.transcriptionModel,
      });

    default:
      throw new Error(
        `Unsupported transcription provider: "${providerType}". ` +
          'Valid options: "deepgram", "assemblyai", "openai", "whisperx"'
      );
  }
}

// ============================================
// Embedding Provider (Ollama Only)
// ============================================

/**
 * Get Ollama embedding provider based on Organization config
 *
 * Ollama is the only embedding provider (768 dimensions, local/private).
 * Default model: nomic-embed-text
 */
export function getEmbeddingProviderWithOrgConfig(config: OrganizationAIConfig): AIProvider {
  logger.info(
    { provider: 'ollama', model: config.embeddingModel },
    'Creating embedding provider (Ollama)'
  );

  return new OllamaProvider({
    baseUrl: config.ollamaBaseUrl,
    embeddingModel: config.embeddingModel,
  });
}

/**
 * Get embedding dimensions
 *
 * Always returns 768 (Ollama nomic-embed-text).
 */
export function getEmbeddingDimensionsFromOrgConfig(_config?: OrganizationAIConfig): number {
  return EMBEDDING_DIMENSION;
}

// ============================================
// General AI Provider
// ============================================

/**
 * Get general AI provider based on Organization config
 *
 * Used for summaries, clustering, theme naming, and other text generation tasks.
 *
 * Supported providers:
 * - gemini: Good for summaries and analysis (default)
 * - openai: Alternative for text generation
 */
export function getGeneralAIProvider(config: OrganizationAIConfig): AIProvider {
  const providerType: GeneralAIProviderType = config.generalAiProvider || 'gemini';

  logger.info(
    { provider: providerType, model: config.generalAiModel },
    'Creating general AI provider'
  );

  switch (providerType) {
    case 'openai':
      return new OpenAIProvider({
        apiKey: config.openaiApiKey,
        textGenerationModel: config.generalAiModel,
      });

    case 'gemini':
    default:
      return new GeminiProvider({
        apiKey: config.geminiApiKey,
        textGenerationModel: config.generalAiModel,
      });
  }
}

// Re-export types
export * from './types';
