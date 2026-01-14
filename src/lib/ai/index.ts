// AI Provider Module
// - Transcription: Deepgram, AssemblyAI, OpenAI, WhisperX
// - Embeddings: Ollama only (768 dimensions)
// - General AI: Gemini, OpenAI

export {
  // Constants
  EMBEDDING_DIMENSION,
  // Organization-config aware functions
  getTranscriptionProvider,
  getEmbeddingProviderWithOrgConfig,
  getEmbeddingDimensionsFromOrgConfig,
  getGeneralAIProvider,
} from './provider';

export type {
  AIProvider,
  AIProviderType,
  TranscriptionInput,
  TranscriptionResult,
  TranscriptSegment,
  EmbeddingResult,
  TextGenerationOptions,
  OrganizationAIConfig,
  TranscriptionProviderType,
  EmbeddingProviderType,
  GeneralAIProviderType,
} from './types';
