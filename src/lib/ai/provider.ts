import type { AIProvider, AIProviderType } from './types';
import { logger } from '../logger';
import { GeminiProvider } from './providers/gemini.provider';
import { OpenAIProvider } from './providers/openai.provider';

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
 * Get the embedding provider (always OpenAI for consistency)
 *
 * We use OpenAI text-embedding-3-small for all embeddings because:
 * - 1536 dimensions works well with pgvector
 * - Consistent vector space across all documents
 * - Better semantic similarity performance
 */
export function getEmbeddingProvider(): AIProvider {
  if (cachedEmbeddingProvider) {
    return cachedEmbeddingProvider;
  }

  const provider: AIProvider = new OpenAIProvider();

  cachedEmbeddingProvider = provider;
  logger.info({ provider: 'openai' }, 'Embedding provider initialized');
  return provider;
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

/**
 * Clear cached providers (useful for testing)
 */
export function clearProviderCache(): void {
  cachedProvider = null;
  cachedEmbeddingProvider = null;
}

// Re-export types
export * from './types';
