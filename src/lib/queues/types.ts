import { z } from 'zod';

export enum QueueName {
  TRANSCRIPTION = 'transcription',
  AUDIO_EXTRACTION = 'audio-extraction',
  VECTORIZATION = 'vectorization',
  SUMMARY_GENERATION = 'summary-generation',
}

// Job data schemas with Zod validation
export const audioExtractionJobSchema = z.object({
  sourceId: z.string().cuid(),
  videoUrl: z.string().url(),
});

export const transcriptionJobSchema = z.object({
  sourceId: z.string().cuid(),
  fileUrl: z.string().url(),
  fileType: z.enum(['video', 'audio']),
});

export const vectorizationJobSchema = z.object({
  sourceId: z.string().cuid(),
  segmentIds: z.array(z.string().cuid()),
});

export const summaryGenerationJobSchema = z
  .object({
    sourceId: z.string().cuid().optional(),
    projectId: z.string().cuid().optional(),
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
