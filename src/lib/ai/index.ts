// AI Provider Module
// Multi-provider abstraction for transcription and embeddings

export {
  getProvider,
  getEmbeddingProvider,
  getEmbeddingDimensions,
  requiresAudioExtraction,
  clearProviderCache,
  // Workspace-config aware functions (for workers)
  getProviderWithConfig,
  getEmbeddingProviderWithConfig,
  requiresAudioExtractionWithConfig,
  getEmbeddingProviderTypeWithConfig,
  getEmbeddingDimensionsWithConfig,
} from './provider';

export type {
  AIProvider,
  AIProviderType,
  AIProviderConfig,
  TranscriptionInput,
  TranscriptionResult,
  TranscriptSegment,
  EmbeddingResult,
  WorkspaceAIConfig,
} from './types';
