// AI Provider Module
// Multi-provider abstraction for transcription and embeddings

export {
  getProvider,
  getEmbeddingProvider,
  getEmbeddingDimensions,
  clearProviderCache,
  // Workspace-config aware functions (legacy, for backward compatibility)
  getProviderWithConfig,
  getEmbeddingProviderWithConfig,
  getEmbeddingProviderTypeWithConfig,
  getEmbeddingDimensionsWithConfig,
  // Organization-config aware functions (primary, for workers)
  getTranscriptionProvider,
  getEmbeddingProviderWithOrgConfig,
  getEmbeddingDimensionsFromOrgConfig,
  getGeneralAIProvider,
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
  OrganizationAIConfig,
  TranscriptionProviderType,
  EmbeddingProviderType,
  GeneralAIProviderType,
} from './types';
