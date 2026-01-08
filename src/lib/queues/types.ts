import { z } from 'zod';

export enum QueueName {
  TRANSCRIPTION = 'transcription',
  AUDIO_EXTRACTION = 'audio-extraction',
  VECTORIZATION = 'vectorization',
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

// Type exports derived from schemas
export type AudioExtractionJobData = z.infer<typeof audioExtractionJobSchema>;
export type TranscriptionJobData = z.infer<typeof transcriptionJobSchema>;
export type VectorizationJobData = z.infer<typeof vectorizationJobSchema>;

export type JobData = AudioExtractionJobData | TranscriptionJobData | VectorizationJobData;
