import { z } from 'zod';

export enum QueueName {
  TRANSCRIPTION = 'transcription',
  AUDIO_EXTRACTION = 'audio-extraction',
  VECTORIZATION = 'vectorization',
  SUMMARY_GENERATION = 'summary-generation',
}

// ID validation - accepts both CUID (Prisma default) and UUID (tenant schema)
const idSchema = z.string().min(1);

// Schema name for multi-tenant support (defaults to tenant_default for self-hosted)
const schemaNameSchema = z.string().default('tenant_default');

// Job data schemas with Zod validation
export const audioExtractionJobSchema = z.object({
  sourceId: idSchema,
  videoUrl: z.string().url(),
  schemaName: schemaNameSchema,
});

export const transcriptionJobSchema = z.object({
  sourceId: idSchema,
  fileUrl: z.string().url(),
  fileType: z.enum(['video', 'audio']),
  schemaName: schemaNameSchema,
});

export const vectorizationJobSchema = z.object({
  sourceId: idSchema,
  segmentIds: z.array(idSchema),
  skipSummary: z.boolean().optional(), // Skip summary generation (used for migrations)
  schemaName: schemaNameSchema,
});

export const summaryGenerationJobSchema = z
  .object({
    sourceId: idSchema.optional(),
    projectId: idSchema.optional(),
    schemaName: schemaNameSchema,
  })
  .refine((data) => data.sourceId || data.projectId, {
    message: 'Either sourceId or projectId must be provided',
  });

// Type exports derived from schemas
export type AudioExtractionJobData = z.infer<typeof audioExtractionJobSchema>;
export type TranscriptionJobData = z.infer<typeof transcriptionJobSchema>;
export type VectorizationJobData = z.infer<typeof vectorizationJobSchema>;
export type SummaryGenerationJobData = z.infer<typeof summaryGenerationJobSchema>;

export type JobData =
  | AudioExtractionJobData
  | TranscriptionJobData
  | VectorizationJobData
  | SummaryGenerationJobData;
