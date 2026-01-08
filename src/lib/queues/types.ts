export enum QueueName {
  TRANSCRIPTION = 'transcription',
  AUDIO_EXTRACTION = 'audio-extraction',
  VECTORIZATION = 'vectorization',
}

export interface TranscriptionJobData {
  sourceId: string;
  audioUrl: string;
}

export interface AudioExtractionJobData {
  sourceId: string;
  videoUrl: string;
}

export interface VectorizationJobData {
  segmentIds: string[];
}

export type JobData = TranscriptionJobData | AudioExtractionJobData | VectorizationJobData;
