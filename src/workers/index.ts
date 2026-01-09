/**
 * OpenInsights Worker Runner
 *
 * Main entry point for BullMQ workers. Runs as a standalone Node.js process.
 *
 * Start with: pnpm worker
 * Or in Docker: docker compose --profile worker up
 *
 * Workers:
 * - Audio Extraction: Only when AI_PROVIDER=openai (FFmpeg extraction)
 * - Transcription: Multi-provider (Gemini native video or OpenAI Whisper)
 * - Vectorization: OpenAI embeddings for semantic search
 */

// Load environment variables first
import 'dotenv/config';

import { logger } from '../lib/logger';

const log = logger.child({ service: 'worker-runner' });

// Track shutdown state
let isShuttingDown = false;

// Worker shutdown functions
const shutdownFunctions: (() => Promise<void>)[] = [];

async function main() {
  log.info('Starting OpenInsights workers');

  const aiProvider = process.env.AI_PROVIDER || 'gemini';
  const concurrency = process.env.WORKER_CONCURRENCY || '2';

  log.info({ aiProvider, concurrency }, 'Worker configuration');

  // Import and start workers
  // Always start audio extraction worker - workspaces may override the default
  // AI provider and use OpenAI even if env var default is Gemini
  log.info('Starting audio extraction worker');
  const audioExtractionModule = await import('../lib/queues/workers/audio-extraction.worker');
  shutdownFunctions.push(audioExtractionModule.shutdownAudioExtractionWorker);
  log.info({ worker: 'audio-extraction', status: 'running' }, 'Worker started');

  // Always start transcription worker
  log.info('Starting transcription worker');
  const transcriptionModule = await import('../lib/queues/workers/transcription.worker');
  shutdownFunctions.push(transcriptionModule.shutdownTranscriptionWorker);
  log.info({ worker: 'transcription', status: 'running' }, 'Worker started');

  // Always start vectorization worker
  log.info('Starting vectorization worker');
  const vectorizationModule = await import('../lib/queues/workers/vectorization.worker');
  shutdownFunctions.push(vectorizationModule.shutdownVectorizationWorker);
  log.info({ worker: 'vectorization', status: 'running' }, 'Worker started');

  log.info('All workers started successfully');
  log.info('Press Ctrl+C to stop');
}

async function shutdown(signal: string) {
  if (isShuttingDown) {
    log.warn('Shutdown already in progress');
    return;
  }

  isShuttingDown = true;
  log.info({ signal }, 'Received shutdown signal, stopping workers...');

  // Close all workers gracefully
  await Promise.allSettled(shutdownFunctions.map((fn) => fn()));

  log.info('All workers stopped');
  process.exit(0);
}

// Handle shutdown signals
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  log.error({ error }, 'Uncaught exception');
  shutdown('uncaughtException').catch(() => process.exit(1));
});

process.on('unhandledRejection', (reason) => {
  log.error({ reason }, 'Unhandled rejection');
  shutdown('unhandledRejection').catch(() => process.exit(1));
});

// Start workers
main().catch((error) => {
  log.error({ error }, 'Failed to start workers');
  process.exit(1);
});
