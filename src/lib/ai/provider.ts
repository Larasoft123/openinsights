import type {
  AIProvider,
  AIProviderType,
  EmbeddingProviderType,
  GeneralAIProviderType,
  TranscriptionProviderType,
  OrganizationAIConfig,
  WorkspaceAIConfig,
} from './types';
import { logger } from '../logger';
import { GeminiProvider } from './providers/gemini.provider';
import { OpenAIProvider } from './providers/openai.provider';
import { OllamaProvider, OLLAMA_EMBEDDING_DIMENSIONS } from './providers/ollama.provider';
import { DeepgramProvider } from './providers/deepgram.provider';
import { AssemblyAIProvider } from './providers/assemblyai.provider';
import { WhisperXProvider } from './providers/whisperx.provider';

// Embedding dimensions by provider
const EMBEDDING_DIMENSIONS: Record<EmbeddingProviderType, number> = {
  openai: 1536,
  gemini: 768,
  ollama: OLLAMA_EMBEDDING_DIMENSIONS, // 768
};

// ============================================
// Organization-config aware functions (NEW)
// ============================================

/**
 * Get transcription provider based on Organization config
 *
 * This is the primary function for transcription - workers should use this.
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

/**
 * Get embedding provider based on Organization config
 *
 * This is the primary function for embeddings - workers should use this.
 *
 * Supported providers:
 * - openai: 1536 dimensions (default)
 * - gemini: 768 dimensions
 * - ollama: 768 dimensions (self-hosted)
 *
 * IMPORTANT: Embedding dimension is set at deployment time. Changing providers
 * after data exists requires re-vectorizing all transcripts.
 */
export function getEmbeddingProviderWithOrgConfig(config: OrganizationAIConfig): AIProvider {
  const providerType = config.embeddingProvider || 'openai';

  logger.info(
    { provider: providerType, model: config.embeddingModel },
    'Creating embedding provider'
  );

  switch (providerType) {
    case 'gemini':
      return new GeminiProvider({
        apiKey: config.geminiApiKey,
        embeddingModel: config.embeddingModel,
      });

    case 'ollama':
      return new OllamaProvider({
        baseUrl: config.ollamaBaseUrl,
        embeddingModel: config.embeddingModel,
      });

    case 'openai':
    default:
      return new OpenAIProvider({
        apiKey: config.openaiApiKey,
        embeddingModel: config.embeddingModel,
      });
  }
}

/**
 * Get embedding dimensions from Organization config
 */
export function getEmbeddingDimensionsFromOrgConfig(config: OrganizationAIConfig): number {
  if (config.embeddingDimension) {
    return config.embeddingDimension;
  }
  const providerType = config.embeddingProvider || 'openai';
  return EMBEDDING_DIMENSIONS[providerType] || 1536;
}

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

// ============================================
// Legacy functions (deprecated, for backward compatibility)
// ============================================

// Lazy-loaded providers to avoid initialization issues
let cachedProvider: AIProvider | null = null;
let cachedEmbeddingProvider: AIProvider | null = null;

/**
 * @deprecated Use getTranscriptionProvider(config) instead
 * Get the configured AI provider for transcription from environment variables
 */
export function getProvider(): AIProvider {
  if (cachedProvider) {
    return cachedProvider;
  }

  const providerType = (process.env.AI_PROVIDER as AIProviderType) || 'gemini';
  let provider: AIProvider;

  switch (providerType) {
    case 'gemini': {
      provider = new GeminiProvider();
      break;
    }
    case 'openai': {
      provider = new OpenAIProvider();
      break;
    }
    default:
      throw new Error(
        `Unsupported AI_PROVIDER: "${providerType}". Valid options: "gemini" or "openai"`
      );
  }

  cachedProvider = provider;
  logger.info({ provider: providerType }, 'AI provider initialized (legacy)');
  return provider;
}

/**
 * @deprecated Use getEmbeddingProviderWithOrgConfig(config) instead
 * Get the configured embedding provider from environment variables
 */
export function getEmbeddingProvider(): AIProvider {
  if (cachedEmbeddingProvider) {
    return cachedEmbeddingProvider;
  }

  const providerType = getEmbeddingProviderType();
  let provider: AIProvider;

  switch (providerType) {
    case 'gemini': {
      provider = new GeminiProvider();
      break;
    }
    case 'ollama': {
      provider = new OllamaProvider();
      break;
    }
    case 'openai':
    default: {
      provider = new OpenAIProvider();
      break;
    }
  }

  cachedEmbeddingProvider = provider;
  logger.info({ provider: providerType }, 'Embedding provider initialized (legacy)');
  return provider;
}

/**
 * @deprecated Use organization config instead
 * Get the configured embedding provider type from environment
 */
export function getEmbeddingProviderType(): EmbeddingProviderType {
  const providerType = process.env.EMBEDDING_PROVIDER as EmbeddingProviderType;
  if (providerType && EMBEDDING_DIMENSIONS[providerType] !== undefined) {
    return providerType;
  }
  return 'openai'; // Default for backward compatibility
}

/**
 * @deprecated Use getEmbeddingDimensionsFromOrgConfig(config) instead
 * Get the embedding dimensions for the configured provider
 */
export function getEmbeddingDimensions(): number {
  const providerType = getEmbeddingProviderType();
  return EMBEDDING_DIMENSIONS[providerType];
}

/**
 * @deprecated Use getTranscriptionProvider(config) instead
 * Get AI provider for transcription with workspace config override
 */
export function getProviderWithConfig(config?: WorkspaceAIConfig | null): AIProvider {
  const providerType: AIProviderType =
    config?.aiProvider ?? (process.env.AI_PROVIDER as AIProviderType) ?? 'gemini';

  switch (providerType) {
    case 'gemini':
      return new GeminiProvider({ apiKey: config?.geminiApiKey });
    case 'openai':
      return new OpenAIProvider({
        apiKey: config?.openaiApiKey,
        transcriptionModel: config?.openaiTranscriptionModel,
      });
    default:
      throw new Error(
        `Unsupported AI provider: "${providerType}". Valid options: "gemini" or "openai"`
      );
  }
}

/**
 * @deprecated Use getEmbeddingProviderWithOrgConfig(config) instead
 * Get embedding provider with workspace config override
 */
export function getEmbeddingProviderWithConfig(config?: WorkspaceAIConfig | null): AIProvider {
  const providerType = getEmbeddingProviderTypeWithConfig(config);

  switch (providerType) {
    case 'gemini':
      return new GeminiProvider({ apiKey: config?.geminiApiKey });
    case 'ollama':
      return new OllamaProvider({ baseUrl: config?.ollamaBaseUrl });
    case 'openai':
    default:
      return new OpenAIProvider({ apiKey: config?.openaiApiKey });
  }
}

/**
 * @deprecated Use organization config instead
 * Get embedding provider type with workspace config override
 */
export function getEmbeddingProviderTypeWithConfig(
  config?: WorkspaceAIConfig | null
): EmbeddingProviderType {
  const providerType =
    config?.embeddingProvider ?? (process.env.EMBEDDING_PROVIDER as EmbeddingProviderType);
  if (providerType && EMBEDDING_DIMENSIONS[providerType] !== undefined) {
    return providerType;
  }
  return 'openai'; // Default for backward compatibility
}

/**
 * @deprecated Use getEmbeddingDimensionsFromOrgConfig(config) instead
 * Get embedding dimensions with workspace config override
 */
export function getEmbeddingDimensionsWithConfig(config?: WorkspaceAIConfig | null): number {
  const providerType = getEmbeddingProviderTypeWithConfig(config);
  return EMBEDDING_DIMENSIONS[providerType];
}

/**
 * Clear cached providers (useful for testing)
 */
export function clearProviderCache(): void {
  cachedProvider = null;
  cachedEmbeddingProvider = null;
}

// Re-export types
export * from './types';
