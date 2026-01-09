import type { AIProvider, AIProviderType, EmbeddingProviderType, WorkspaceAIConfig } from './types';
import { logger } from '../logger';
import { GeminiProvider } from './providers/gemini.provider';
import { OpenAIProvider } from './providers/openai.provider';
import { OllamaProvider, OLLAMA_EMBEDDING_DIMENSIONS } from './providers/ollama.provider';

// Embedding dimensions by provider
const EMBEDDING_DIMENSIONS: Record<EmbeddingProviderType, number> = {
  openai: 1536,
  gemini: 768,
  ollama: OLLAMA_EMBEDDING_DIMENSIONS, // 768
};

// Lazy-loaded providers to avoid initialization issues
let cachedProvider: AIProvider | null = null;
let cachedEmbeddingProvider: AIProvider | null = null;

/**
 * Get the configured AI provider for transcription
 *
 * @returns AIProvider instance (Gemini or OpenAI)
 * @throws Error if provider is not configured or missing API key
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
  logger.info({ provider: providerType }, 'AI provider initialized');
  return provider;
}

/**
 * Get the configured embedding provider
 *
 * IMPORTANT: This is a deployment-time decision. Changing providers after
 * data exists requires dropping all embeddings and re-vectorizing.
 *
 * Supported providers:
 * - openai: text-embedding-3-small (1536 dims) - Best quality, cloud
 * - gemini: text-embedding-004 (768 dims) - Good quality, cloud
 * - ollama: nomic-embed-text (768 dims) - Local/private, self-hosted
 *
 * Set via EMBEDDING_PROVIDER environment variable.
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
  logger.info({ provider: providerType }, 'Embedding provider initialized');
  return provider;
}

/**
 * Get the configured embedding provider type
 */
export function getEmbeddingProviderType(): EmbeddingProviderType {
  const providerType = process.env.EMBEDDING_PROVIDER as EmbeddingProviderType;
  if (providerType && EMBEDDING_DIMENSIONS[providerType] !== undefined) {
    return providerType;
  }
  return 'openai'; // Default for backward compatibility
}

/**
 * Get the embedding dimensions for the configured provider
 *
 * Used by database setup scripts to create the correct vector column size.
 */
export function getEmbeddingDimensions(): number {
  const providerType = getEmbeddingProviderType();
  return EMBEDDING_DIMENSIONS[providerType];
}

/**
 * Check if audio extraction is required based on provider
 *
 * Gemini: Can process video directly, no extraction needed
 * OpenAI: Requires audio extraction first (FFmpeg)
 */
export function requiresAudioExtraction(): boolean {
  const providerType = (process.env.AI_PROVIDER as AIProviderType) || 'gemini';
  return providerType === 'openai';
}

// ============================================
// Workspace-config aware functions
// ============================================

/**
 * Get AI provider for transcription with workspace config override
 *
 * Priority: workspace config > environment variable > default (gemini)
 *
 * NOTE: This creates a fresh provider instance (not cached) to respect
 * workspace-specific settings. Workers should use this function.
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
 * Get embedding provider with workspace config override
 *
 * Priority: workspace config > environment variable > default (openai)
 *
 * NOTE: Creates fresh provider instance for workspace-specific settings.
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
 * Get embedding dimensions with workspace config override
 */
export function getEmbeddingDimensionsWithConfig(config?: WorkspaceAIConfig | null): number {
  const providerType = getEmbeddingProviderTypeWithConfig(config);
  return EMBEDDING_DIMENSIONS[providerType];
}

/**
 * Check if audio extraction is required with workspace config override
 *
 * Gemini: Can process video directly, no extraction needed
 * OpenAI: Requires audio extraction first (FFmpeg)
 */
export function requiresAudioExtractionWithConfig(config?: WorkspaceAIConfig | null): boolean {
  const providerType: AIProviderType =
    config?.aiProvider ?? (process.env.AI_PROVIDER as AIProviderType) ?? 'gemini';
  return providerType === 'openai';
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
