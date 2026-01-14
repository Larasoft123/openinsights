import { z } from 'zod';
import { SUPPORTED_LANGUAGES, LANGUAGE_AUTO } from '../constants/languages';

// Common validation schemas for OpenInsights

// Accept both CUIDs (public schema) and UUIDs (tenant schema)
export const idSchema = z.string().min(1);

// Language validation - ISO 639-1 codes or 'auto'
const languageCodes: string[] = SUPPORTED_LANGUAGES.map((l) => l.code);
export const languageSchema = z
  .string()
  .refine(
    (val) => val === LANGUAGE_AUTO || languageCodes.includes(val),
    'Invalid language code. Use ISO 639-1 codes (e.g., en, ru, es) or "auto".'
  );

// Project language (required, defaults to 'en')
export const projectLanguageSchema = z
  .string()
  .refine((val) => languageCodes.includes(val), 'Invalid language code. Use ISO 639-1 codes.')
  .default('en');

// Source language (can be 'auto' or specific code)
export const sourceLanguageSchema = languageSchema.default('auto');

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
  language: projectLanguageSchema.optional(),
  workspaceId: z.string().min(1),
});

export const tagSchema = z.object({
  name: z.string().min(1).max(100),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .default('#3B82F6'),
  description: z.string().max(500).optional(),
});

// Theme schemas
export const createThemeSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullish(), // accepts null, undefined, or string
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .nullish(),
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
  projectId: z.string().min(1),
});

// Create source schema (for API - includes file size validation)
export const createSourceSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  fileName: z.string().min(1).max(255),
  fileType: z.enum(sourceFileTypes),
  fileSize: z
    .number()
    .positive()
    .max(2 * 1024 * 1024 * 1024, 'File must be less than 2GB'),
  language: sourceLanguageSchema.optional(),
});

// Source update schema (for PATCH operations)
export const updateSourceSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).nullable().optional(), // null = clear description
  restore: z.boolean().optional(), // true = restore from trash
  retry: z.boolean().optional(), // true = retry failed processing
  cancel: z.boolean().optional(), // true = cancel/reset stuck processing
});

// Processing status enum (matches Prisma)
export const processingStatusSchema = z.enum([
  'PENDING',
  'UPLOADING',
  'PROCESSING',
  'COMPLETED',
  'FAILED',
]);

// Transcript segment schema (for worker creation)
export const transcriptSegmentSchema = z.object({
  content: z.string().min(1),
  startTime: z.number().nonnegative(),
  endTime: z.number().nonnegative(),
  speakerId: z.string().optional(),
  sourceId: z.string().min(1),
});

// Create transcript segment schema (for API - manual creation)
export const createTranscriptSegmentSchema = z
  .object({
    content: z.string().min(1, 'Content is required').max(10000),
    startTime: z.number().nonnegative('Start time must be non-negative'),
    endTime: z.number().positive('End time must be positive'),
    speakerId: z.string().max(100).optional(),
  })
  .refine((data) => data.endTime > data.startTime, {
    message: 'End time must be after start time',
    path: ['endTime'],
  });

// Update transcript segment schema (for API - edit content and speaker)
export const updateTranscriptSegmentSchema = z.object({
  content: z.string().min(1, 'Content is required').max(10000).optional(),
  speakerId: z.string().max(100).nullable().optional(),
});

// Highlight schema
export const highlightSchema = z.object({
  note: z.string().max(1000).optional(),
  segmentId: z.string().min(1),
  tagId: z.string().min(1),
  selectedText: z.string().min(2).max(5000).optional(), // The exact text user selected
});

// AI Provider schemas
export const aiProviderSchema = z.enum(['gemini', 'openai']);
export const openaiTranscriptionModelSchema = z.enum(['whisper-1', 'gpt-4o-transcribe-diarize']);

// Task-specific provider schemas
export const transcriptionProviderSchema = z.enum(['deepgram', 'assemblyai', 'openai', 'whisperx']);
export const generalAiProviderSchema = z.enum(['gemini', 'openai']);

// Organization AI Settings schema (for API updates)
export const organizationAiSettingsSchema = z.object({
  // Transcription settings
  transcriptionProvider: transcriptionProviderSchema.nullable().optional(),
  deepgramApiKey: z.string().nullable().optional(),
  assemblyaiApiKey: z.string().nullable().optional(),
  whisperxEndpoint: z.string().url().nullable().optional(),

  // Embedding settings (Ollama only - 768 dimensions)
  ollamaBaseUrl: z.string().url().nullable().optional(),
  embeddingModel: z.string().nullable().optional(),

  // General AI settings
  generalAiProvider: generalAiProviderSchema.nullable().optional(),

  // Model selection (fetched from provider APIs)
  transcriptionModel: z.string().nullable().optional(),
  generalAiModel: z.string().nullable().optional(),

  // Shared API keys (empty string = clear, undefined = keep existing)
  openaiApiKey: z.string().nullable().optional(),
  geminiApiKey: z.string().nullable().optional(),
});

// Type exports
export type PaginationInput = z.infer<typeof paginationSchema>;
export type WorkspaceInput = z.infer<typeof workspaceSchema>;
export type ProjectInput = z.infer<typeof projectSchema>;
export type TagInput = z.infer<typeof tagSchema>;
export type CreateThemeInput = z.infer<typeof createThemeSchema>;
export type SourceInput = z.infer<typeof sourceSchema>;
export type CreateSourceInput = z.infer<typeof createSourceSchema>;
export type UpdateSourceInput = z.infer<typeof updateSourceSchema>;
export type ProcessingStatus = z.infer<typeof processingStatusSchema>;
export type TranscriptSegmentInput = z.infer<typeof transcriptSegmentSchema>;
export type CreateTranscriptSegmentInput = z.infer<typeof createTranscriptSegmentSchema>;
export type UpdateTranscriptSegmentInput = z.infer<typeof updateTranscriptSegmentSchema>;
export type HighlightInput = z.infer<typeof highlightSchema>;
export type AIProvider = z.infer<typeof aiProviderSchema>;
export type OpenAITranscriptionModel = z.infer<typeof openaiTranscriptionModelSchema>;
export type TranscriptionProvider = z.infer<typeof transcriptionProviderSchema>;
export type GeneralAiProvider = z.infer<typeof generalAiProviderSchema>;
export type OrganizationAiSettings = z.infer<typeof organizationAiSettingsSchema>;

// Theme suggestion schemas (Magic Cluster)
export const suggestThemesSchema = z.object({
  minClusters: z.number().int().min(2).max(10).default(3),
  maxClusters: z.number().int().min(2).max(10).default(7),
});

export const suggestedThemeSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).nullable(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  highlightIds: z.array(z.string()),
  confidence: z.number().min(0).max(1).optional(),
});

export type SuggestThemesInput = z.infer<typeof suggestThemesSchema>;
export type SuggestedTheme = z.infer<typeof suggestedThemeSchema>;

// ============================================
// METADATA SCHEMAS (Unified custom fields system)
// ============================================

// Metadata entity type - which entity the fields attach to
export const metadataEntityTypeSchema = z.enum(['SOURCE', 'PROJECT']);

// Metadata field type - the data type of the field
export const metadataFieldTypeSchema = z.enum(['TEXT', 'SELECT', 'BOOLEAN', 'NUMBER', 'DATE']);

// Slug validation - lowercase alphanumeric with underscores
const slugRegex = /^[a-z][a-z0-9_]*$/;

// Create metadata field schema
export const createMetadataFieldSchema = z.object({
  entityType: metadataEntityTypeSchema,
  name: z
    .string()
    .min(1, 'Name is required')
    .max(50)
    .regex(
      slugRegex,
      'Name must start with a letter and contain only lowercase letters, numbers, and underscores'
    ),
  label: z.string().min(1, 'Label is required').max(100),
  fieldType: metadataFieldTypeSchema,
  options: z.array(z.string().min(1).max(100)).max(50).optional(),
  required: z.boolean().optional(),
  placeholder: z.string().max(200).nullish(),
  displayOrder: z.number().int().nonnegative().optional(),
});

// Update metadata field schema (all fields optional)
export const updateMetadataFieldSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(50)
    .regex(
      slugRegex,
      'Name must start with a letter and contain only lowercase letters, numbers, and underscores'
    )
    .optional(),
  label: z.string().min(1).max(100).optional(),
  fieldType: metadataFieldTypeSchema.optional(),
  options: z.array(z.string().min(1).max(100)).max(50).optional(),
  required: z.boolean().optional(),
  placeholder: z.string().max(200).nullish(),
  displayOrder: z.number().int().nonnegative().optional(),
});

// Reorder metadata fields schema
export const reorderMetadataFieldsSchema = z.object({
  fieldIds: z.array(z.string().min(1)).min(1),
});

// Metadata value input (single field value)
export const metadataValueInputSchema = z.object({
  fieldId: z.string().min(1),
  value: z.string().nullish(),
});

// Upsert metadata values schema (bulk update)
export const upsertMetadataValuesSchema = z.object({
  values: z.array(metadataValueInputSchema).min(1),
});

// Type exports
export type MetadataEntityType = z.infer<typeof metadataEntityTypeSchema>;
export type MetadataFieldType = z.infer<typeof metadataFieldTypeSchema>;
export type CreateMetadataFieldInput = z.infer<typeof createMetadataFieldSchema>;
export type UpdateMetadataFieldInput = z.infer<typeof updateMetadataFieldSchema>;
export type ReorderMetadataFieldsInput = z.infer<typeof reorderMetadataFieldsSchema>;
export type MetadataValueInput = z.infer<typeof metadataValueInputSchema>;
export type UpsertMetadataValuesInput = z.infer<typeof upsertMetadataValuesSchema>;

// ============================================
// PRESET SCHEMAS (Research Project Presets)
// ============================================

// Preset category - type of research methodology
export const presetCategorySchema = z.enum([
  'DISCOVERY',
  'USABILITY',
  'VOICE_OF_CUSTOMER',
  'COMPETITIVE',
  'SALES',
  'SUPPORT',
  'OTHER',
]);

// Preset visibility - who can see/use the preset
export const presetVisibilitySchema = z.enum(['PRIVATE', 'TEAM', 'COMMUNITY']);

// Tag definition for preset config
export const presetTagDefinitionSchema = z.object({
  name: z.string().min(1).max(100),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  description: z.string().max(500).optional(),
});

// Metadata field definition for preset config
export const presetMetadataFieldDefinitionSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(50)
    .regex(
      /^[a-z][a-z0-9_]*$/,
      'Name must start with a letter and contain only lowercase letters, numbers, and underscores'
    ),
  label: z.string().min(1).max(100),
  fieldType: metadataFieldTypeSchema,
  options: z.array(z.string().min(1).max(100)).max(50).optional(),
  required: z.boolean().optional(),
  placeholder: z.string().max(200).optional(),
});

// AI prompts configuration for preset config
export const presetAIPromptsSchema = z.object({
  sourceSummaryPrompt: z.string().max(10000).optional(),
  projectSummaryPrompt: z.string().max(10000).optional(),
  themeNamingPrompt: z.string().max(10000).optional(),
  autoTaggingPrompt: z.string().max(10000).optional(),
  autoTaggingEnabled: z.boolean().optional(),
});

// Project settings for preset config
export const presetProjectSettingsSchema = z.object({
  projectType: z.string().max(100).optional(),
  goals: z.string().max(5000).optional(),
  context: z.string().max(5000).optional(),
});

// Complete preset config schema
export const presetConfigSchema = z.object({
  tags: z.array(presetTagDefinitionSchema).max(100).default([]),
  metadataFields: z.array(presetMetadataFieldDefinitionSchema).max(50).default([]),
  aiPrompts: presetAIPromptsSchema.default({}),
  projectSettings: presetProjectSettingsSchema.default({}),
});

// Create preset schema
export const createPresetSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(1000).optional(),
  category: presetCategorySchema,
  config: presetConfigSchema,
});

// Update preset schema (all fields optional)
export const updatePresetSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(1000).nullish(),
  category: presetCategorySchema.optional(),
  config: presetConfigSchema.optional(),
});

// Apply preset schema (for applying to new project)
export const applyPresetSchema = z.object({
  workspaceId: z.string().min(1),
  projectName: z.string().min(1).max(255),
  projectDescription: z.string().max(1000).optional(),
  projectLanguage: projectLanguageSchema.optional(),
});

// Save as preset schema (for extracting from project)
export const saveAsPresetSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(1000).optional(),
  category: presetCategorySchema,
  // Options for what to include
  includeTags: z.boolean().default(true),
  includeMetadataFields: z.boolean().default(true),
  includeAIPrompts: z.boolean().default(true),
  includeProjectSettings: z.boolean().default(true),
});

// Type exports
export type PresetCategory = z.infer<typeof presetCategorySchema>;
export type PresetVisibility = z.infer<typeof presetVisibilitySchema>;
export type PresetTagDefinition = z.infer<typeof presetTagDefinitionSchema>;
export type PresetMetadataFieldDefinition = z.infer<typeof presetMetadataFieldDefinitionSchema>;
export type PresetAIPrompts = z.infer<typeof presetAIPromptsSchema>;
export type PresetProjectSettings = z.infer<typeof presetProjectSettingsSchema>;
export type PresetConfig = z.infer<typeof presetConfigSchema>;
export type CreatePresetInput = z.infer<typeof createPresetSchema>;
export type UpdatePresetInput = z.infer<typeof updatePresetSchema>;
export type ApplyPresetInput = z.infer<typeof applyPresetSchema>;
export type SaveAsPresetInput = z.infer<typeof saveAsPresetSchema>;
