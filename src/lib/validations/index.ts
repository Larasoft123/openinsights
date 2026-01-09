import { z } from 'zod';

// Common validation schemas for OpenInsights

export const idSchema = z.string().cuid();

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

// Workspace schemas
export const workspaceSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z
    .string()
    .min(1)
    .max(63)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase with hyphens only'),
});

export const projectSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  workspaceId: z.string().cuid(),
});

export const tagSchema = z.object({
  name: z.string().min(1).max(100),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .default('#3B82F6'),
  description: z.string().max(500).optional(),
});

// Source schemas
export const sourceFileTypes = [
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'audio/mp3',
  'audio/wav',
  'audio/mpeg',
  'audio/m4a',
] as const;

export const sourceSchema = z.object({
  title: z.string().min(1).max(255),
  fileName: z.string().min(1).max(255),
  fileType: z.enum(sourceFileTypes),
  projectId: z.string().cuid(),
});

// Processing status enum (matches Prisma)
export const processingStatusSchema = z.enum([
  'PENDING',
  'UPLOADING',
  'PROCESSING',
  'COMPLETED',
  'FAILED',
]);

// Transcript segment schema
export const transcriptSegmentSchema = z.object({
  content: z.string().min(1),
  startTime: z.number().nonnegative(),
  endTime: z.number().nonnegative(),
  speakerId: z.string().optional(),
  sourceId: z.string().cuid(),
});

// Highlight schema
export const highlightSchema = z.object({
  note: z.string().max(1000).optional(),
  segmentId: z.string().cuid(),
  tagId: z.string().cuid(),
});

// AI Provider schemas
export const aiProviderSchema = z.enum(['gemini', 'openai']);
export const openaiTranscriptionModelSchema = z.enum(['whisper-1', 'gpt-4o-transcribe-diarize']);
export const embeddingProviderSchema = z.enum(['openai', 'gemini', 'ollama']);

// Workspace AI Settings schema (for API updates)
export const workspaceAiSettingsSchema = z.object({
  // Provider selection
  aiProvider: aiProviderSchema.nullable().optional(),
  openaiTranscriptionModel: openaiTranscriptionModelSchema.nullable().optional(),
  embeddingProvider: embeddingProviderSchema.nullable().optional(),

  // API Keys (empty string = clear, undefined = keep existing)
  geminiApiKey: z.string().nullable().optional(),
  openaiApiKey: z.string().nullable().optional(),
  ollamaBaseUrl: z.string().url().nullable().optional(),
});

// Type exports
export type PaginationInput = z.infer<typeof paginationSchema>;
export type WorkspaceInput = z.infer<typeof workspaceSchema>;
export type ProjectInput = z.infer<typeof projectSchema>;
export type TagInput = z.infer<typeof tagSchema>;
export type SourceInput = z.infer<typeof sourceSchema>;
export type ProcessingStatus = z.infer<typeof processingStatusSchema>;
export type TranscriptSegmentInput = z.infer<typeof transcriptSegmentSchema>;
export type HighlightInput = z.infer<typeof highlightSchema>;
export type AIProvider = z.infer<typeof aiProviderSchema>;
export type OpenAITranscriptionModel = z.infer<typeof openaiTranscriptionModelSchema>;
export type EmbeddingProvider = z.infer<typeof embeddingProviderSchema>;
export type WorkspaceAiSettings = z.infer<typeof workspaceAiSettingsSchema>;
