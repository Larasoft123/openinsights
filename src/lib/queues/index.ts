import { Queue } from 'bullmq';
import { connectionOptions } from './connection';
import { QueueName } from './types';

export * from './types';
export * from './connection';

const defaultQueueOptions = {
  connection: connectionOptions,
  defaultJobOptions: {
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 500 },
    attempts: 3,
    backoff: {
      type: 'exponential' as const,
      delay: 1000,
    },
  },
};

export const transcriptionQueue = new Queue(QueueName.TRANSCRIPTION, defaultQueueOptions);

export const audioExtractionQueue = new Queue(QueueName.AUDIO_EXTRACTION, defaultQueueOptions);

export const vectorizationQueue = new Queue(QueueName.VECTORIZATION, defaultQueueOptions);

export const autoHighlightingQueue = new Queue(QueueName.AUTO_HIGHLIGHTING, defaultQueueOptions);

export const summaryGenerationQueue = new Queue(QueueName.SUMMARY_GENERATION, defaultQueueOptions);

export const queues = {
  [QueueName.TRANSCRIPTION]: transcriptionQueue,
  [QueueName.AUDIO_EXTRACTION]: audioExtractionQueue,
  [QueueName.VECTORIZATION]: vectorizationQueue,
  [QueueName.AUTO_HIGHLIGHTING]: autoHighlightingQueue,
  [QueueName.SUMMARY_GENERATION]: summaryGenerationQueue,
};
