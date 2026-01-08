// AI Provider Module
// Multi-provider abstraction for transcription and embeddings

export {
  getProvider,
  getEmbeddingProvider,
  requiresAudioExtraction,
  clearProviderCache,
} from './provider';

export type {
  AIProvider,
  AIProviderType,
  AIProviderConfig,
  TranscriptionInput,
  TranscriptionResult,
  TranscriptSegment,
  EmbeddingResult,
} from './types';
