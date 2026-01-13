/**
 * AI Provider Abstraction Types
 *
 * Defines interfaces for multi-provider AI support (Gemini + OpenAI)
 */

export interface TranscriptSegment {
  startTime: number; // Time in seconds
  endTime: number; // Time in seconds
  content: string;
  speakerId?: string;
}

export interface TranscriptionResult {
  segments: TranscriptSegment[];
  duration: number; // Total duration in seconds
  language?: string;
}

export interface TranscriptionInput {
  sourceId: string;
  fileUrl: string; // S3/MinIO presigned URL
  fileType: 'video' | 'audio';
  language?: string; // ISO 639-1 code (e.g., 'en', 'ru', 'es')
}

export interface EmbeddingResult {
  embeddings: number[][];
  model: string;
  dimensions: number;
}

export interface TextGenerationOptions {
  maxTokens?: number;
  temperature?: number;
  /** Audio data for multimodal input (e.g., language detection) */
  audioData?: {
    data: string; // base64 encoded audio
    mimeType: string; // e.g., 'audio/mpeg'
  };
}

/**
 * AI Provider interface
 * Implemented by OpenAI and Gemini providers
 */
export interface AIProvider {
  readonly name: string;

  /**
   * Transcribe audio/video to text with timestamps
   * Gemini: Accepts video directly
   * OpenAI: Requires audio (WAV/MP3)
   */
  transcribe(input: TranscriptionInput): Promise<TranscriptionResult>;

  /**
   * Generate embeddings for text
   * Used for semantic search
   */
  embed(texts: string[]): Promise<EmbeddingResult>;

  /**
   * Check if provider supports direct video input
   * Gemini: true, OpenAI: false
   */
  supportsVideoInput(): boolean;

  /**
   * Generate text completion (for theme naming, etc.)
   * Optional - not all providers may implement this
   */
  generateText?(prompt: string, options?: TextGenerationOptions): Promise<string>;
}

// ============================================
// Provider Types (Task-Specific)
// ============================================

/**
 * Transcription (STT) provider types
 * - deepgram: Native diarization, excellent accuracy (cloud)
 * - assemblyai: High-accuracy diarization (cloud)
 * - openai: Whisper-1 or gpt-4o-transcribe-diarize (cloud)
 * - whisperx: Self-hosted with pyannote diarization (local)
 */
export type TranscriptionProviderType = 'deepgram' | 'assemblyai' | 'openai' | 'whisperx';

/**
 * Embedding provider types
 * - openai: 1536 dimensions (cloud, default)
 * - gemini: 768 dimensions (cloud)
 * - ollama: 768 dimensions (local/private)
 */
export type EmbeddingProviderType = 'openai' | 'gemini' | 'ollama';

/**
 * General AI provider types (summaries, clustering, theme naming)
 * - gemini: Good for summaries and analysis (cloud, default)
 * - openai: Alternative for text generation (cloud)
 */
export type GeneralAIProviderType = 'gemini' | 'openai';

// Legacy type alias for backward compatibility
export type AIProviderType = 'gemini' | 'openai';

// ============================================
// Configuration Types
// ============================================

/**
 * Organization-level AI configuration
 * Stored in public schema via Prisma, encrypted API keys
 */
export interface OrganizationAIConfig {
  // Transcription (STT) settings
  transcriptionProvider?: TranscriptionProviderType | null;
  deepgramApiKey?: string | null;
  assemblyaiApiKey?: string | null;
  whisperxEndpoint?: string | null;

  // Embedding settings
  embeddingProvider?: EmbeddingProviderType | null;
  embeddingDimension?: number;
  ollamaBaseUrl?: string | null;

  // General AI settings
  generalAiProvider?: GeneralAIProviderType | null;

  // Model selection (fetched from provider APIs)
  transcriptionModel?: string | null; // e.g., "nova-3", "large-v3"
  embeddingModel?: string | null; // e.g., "text-embedding-3-small"
  generalAiModel?: string | null; // e.g., "gemini-2.5-flash", "gpt-4o-mini"

  // Shared API keys
  openaiApiKey?: string | null;
  geminiApiKey?: string | null;
}

/**
 * @deprecated Use OrganizationAIConfig instead
 * Workspace-specific AI configuration - kept for backward compatibility
 */
export interface WorkspaceAIConfig {
  // Provider selection
  aiProvider?: AIProviderType | null;
  openaiTranscriptionModel?: 'whisper-1' | 'gpt-4o-transcribe-diarize' | null;
  embeddingProvider?: EmbeddingProviderType | null;

  // API Keys (workspace keys take priority over env vars)
  geminiApiKey?: string | null;
  openaiApiKey?: string | null;
  ollamaBaseUrl?: string | null;
}

/**
 * @deprecated Use OrganizationAIConfig instead
 */
export interface AIProviderConfig {
  provider: AIProviderType;
  embeddingProvider?: EmbeddingProviderType;
  geminiApiKey?: string;
  openaiApiKey?: string;
  ollamaBaseUrl?: string;
}
