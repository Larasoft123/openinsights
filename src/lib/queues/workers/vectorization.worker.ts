import { Worker, Job } from 'bullmq';
import { connectionOptions } from '../connection';
import { QueueName, vectorizationJobSchema, VectorizationJobData } from '../types';
import { getEmbeddingProviderWithConfig, getEmbeddingDimensionsWithConfig } from '../../ai';
import { prisma } from '../../db';
import { logger } from '../../logger';
import { getWorkspaceAIConfigBySourceId } from '../../services/workspace-settings.service';
import { getEmbeddingColumnName } from '../../utils';

const log = logger.child({ worker: 'vectorization' });

// Process embeddings in small batches for visible progress
// Gemini embeds one text at a time internally, so smaller batches = more progress updates
const BATCH_SIZE = 50;
// Update progress in DB after each batch
const PROGRESS_UPDATE_INTERVAL = 10;

/**
 * Vectorization Worker
 *
 * Generates embeddings for transcript segments using OpenAI
 * and stores them in pgvector for semantic search.
 *
 * Flow:
 * 1. Batch fetch segment contents from database
 * 2. Generate embeddings via OpenAI text-embedding-3-small
 * 3. Update segments with vectors via raw SQL
 * 4. Mark source as COMPLETED
 */
async function processJob(job: Job<VectorizationJobData>): Promise<void> {
  const startTime = Date.now();

  // Validate job data with Zod
  const data = vectorizationJobSchema.parse(job.data);
  const { sourceId, segmentIds } = data;

  const jobLog = log.child({ jobId: job.id, sourceId, segmentCount: segmentIds.length });
  jobLog.info('Starting vectorization');

  try {
    // Fetch segments from database
    const segments = await prisma.transcriptSegment.findMany({
      where: { id: { in: segmentIds } },
      select: { id: true, content: true },
    });

    if (segments.length === 0) {
      jobLog.warn('No segments found to vectorize');
      return;
    }

    jobLog.info({ fetchedCount: segments.length }, 'Segments fetched');
    await job.updateProgress(20);

    // Look up workspace AI configuration
    const workspaceConfig = await getWorkspaceAIConfigBySourceId(sourceId);
    jobLog.debug({ workspaceConfig }, 'Retrieved workspace AI config');

    // Get embedding provider with workspace config (falls back to env vars if null)
    const provider = getEmbeddingProviderWithConfig(workspaceConfig);
    const embeddingDimension = getEmbeddingDimensionsWithConfig(workspaceConfig);
    const embeddingColumn = getEmbeddingColumnName(embeddingDimension);
    jobLog.info(
      { provider: provider.name, dimension: embeddingDimension, column: embeddingColumn },
      'Using embedding provider'
    );

    // Process in batches
    let processedCount = 0;

    for (let i = 0; i < segments.length; i += BATCH_SIZE) {
      const batch = segments.slice(i, i + BATCH_SIZE);
      const texts = batch.map((s) => s.content);

      jobLog.info({ batchStart: i, batchSize: batch.length }, 'Processing batch');

      // Generate embeddings
      const result = await provider.embed(texts);

      // Update segments with embeddings using raw SQL for pgvector
      for (let j = 0; j < batch.length; j++) {
        const segment = batch[j];
        const embedding = result.embeddings[j];

        // Format embedding as pgvector string: [0.1, 0.2, ...]
        const vectorString = `[${embedding.join(',')}]`;

        // Use $executeRawUnsafe with sanitized column name (column name is from our switch statement, not user input)
        await prisma.$executeRawUnsafe(
          `UPDATE transcript_segments SET ${embeddingColumn} = $1::vector WHERE id = $2`,
          vectorString,
          segment.id
        );

        processedCount++;

        // Update progress in DB periodically (every N segments)
        if (processedCount % PROGRESS_UPDATE_INTERVAL === 0 || processedCount === segments.length) {
          const progress = Math.round((processedCount / segments.length) * 100);
          await job.updateProgress(progress);

          await prisma.source.update({
            where: { id: sourceId },
            data: { processingProgress: progress },
          });
        }
      }
    }

    jobLog.info({ processedCount }, 'All segments vectorized');
    await job.updateProgress(95);

    // Mark source as COMPLETED and clear progress fields
    await prisma.source.update({
      where: { id: sourceId },
      data: {
        status: 'COMPLETED',
        processingStep: null,
        processingProgress: null,
        processingStartedAt: null,
      },
    });

    const duration = Date.now() - startTime;
    jobLog.info({ duration }, 'Vectorization complete');
    await job.updateProgress(100);
  } catch (error) {
    jobLog.error({ error }, 'Vectorization failed');

    // Update source status to FAILED
    await prisma.source.update({
      where: { id: sourceId },
      data: { status: 'FAILED' },
    });

    throw error;
  }
}

// Create the worker
const concurrency = parseInt(process.env.WORKER_CONCURRENCY || '2', 10);

export const vectorizationWorker = new Worker<VectorizationJobData>(
  QueueName.VECTORIZATION,
  processJob,
  {
    connection: connectionOptions,
    concurrency,
  }
);

// Event handlers
vectorizationWorker.on('completed', (job) => {
  log.info({ jobId: job.id, sourceId: job.data.sourceId }, 'Job completed');
});

vectorizationWorker.on('failed', (job, error) => {
  log.error({ jobId: job?.id, sourceId: job?.data.sourceId, error }, 'Job failed');
});

vectorizationWorker.on('error', (error) => {
  log.error({ error }, 'Worker error');
});

// Graceful shutdown
export async function shutdownVectorizationWorker(): Promise<void> {
  log.info('Shutting down vectorization worker');
  await vectorizationWorker.close();
  log.info('Vectorization worker shut down');
}
