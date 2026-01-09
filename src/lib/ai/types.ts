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
}

export interface EmbeddingResult {
  embeddings: number[][];
  model: string;
  dimensions: number;
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
}

export type AIProviderType = 'gemini' | 'openai';

/**
 * Embedding provider types
 * - openai: 1536 dimensions (cloud)
 * - gemini: 768 dimensions (cloud)
 * - ollama: 768 dimensions (local/private)
 */
export type EmbeddingProviderType = 'openai' | 'gemini' | 'ollama';

export interface AIProviderConfig {
  provider: AIProviderType;
  embeddingProvider?: EmbeddingProviderType;
  geminiApiKey?: string;
  openaiApiKey?: string;
  ollamaBaseUrl?: string;
}

/**
 * Workspace-specific AI configuration
 * All fields are nullable - null means use environment variable defaults
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
