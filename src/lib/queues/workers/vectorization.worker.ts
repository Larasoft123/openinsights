import { Worker, Job } from 'bullmq';
import { connectionOptions } from '../connection';
import { QueueName, vectorizationJobSchema, VectorizationJobData } from '../types';
import { summaryGenerationQueue } from '../index';
import { getEmbeddingProviderWithConfig, getEmbeddingDimensionsWithConfig } from '../../ai';
import { withTenantSchema } from '../../db/tenant';
import { updateSource, updateSegmentEmbedding } from '../../db/tenant-queries';
import { logger } from '../../logger';
import { getWorkspaceAIConfigBySourceId } from '../../services/workspace-settings.service';

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
  const { sourceId, segmentIds, skipSummary, schemaName } = data;

  const jobLog = log.child({
    jobId: job.id,
    sourceId,
    schemaName,
    segmentCount: segmentIds.length,
  });
  jobLog.info('Starting vectorization');

  try {
    // Fetch segments from tenant database
    const segments = await withTenantSchema(schemaName, async (client) => {
      const result = await client.query(
        `SELECT id, content FROM transcript_segments WHERE id = ANY($1)`,
        [segmentIds]
      );
      return result.rows as Array<{ id: string; content: string }>;
    });

    if (segments.length === 0) {
      jobLog.warn('No segments found to vectorize');
      return;
    }

    // Filter out segments with empty/whitespace-only content (embedding APIs reject empty strings)
    const validSegments = segments.filter((s) => s.content.trim().length > 0);
    const skippedCount = segments.length - validSegments.length;

    if (skippedCount > 0) {
      jobLog.info({ skippedCount, reason: 'empty content' }, 'Skipped segments with empty content');
    }

    if (validSegments.length === 0) {
      jobLog.warn('No valid segments to vectorize after filtering empty content');
      return;
    }

    jobLog.info(
      { fetchedCount: segments.length, validCount: validSegments.length },
      'Segments fetched'
    );
    await job.updateProgress(20);

    // Look up workspace AI configuration
    const workspaceConfig = await getWorkspaceAIConfigBySourceId(schemaName, sourceId);
    jobLog.debug({ workspaceConfig }, 'Retrieved workspace AI config');

    // Get embedding provider with workspace config (falls back to env vars if null)
    const provider = getEmbeddingProviderWithConfig(workspaceConfig);
    const embeddingDimension = getEmbeddingDimensionsWithConfig(workspaceConfig);
    jobLog.info(
      { provider: provider.name, dimension: embeddingDimension },
      'Using embedding provider'
    );

    // Process in batches
    let processedCount = 0;

    for (let i = 0; i < validSegments.length; i += BATCH_SIZE) {
      const batch = validSegments.slice(i, i + BATCH_SIZE);
      const texts = batch.map((s) => s.content);

      jobLog.info({ batchStart: i, batchSize: batch.length }, 'Processing batch');

      // Generate embeddings
      const result = await provider.embed(texts);

      // Update segments with embeddings using tenant query
      for (let j = 0; j < batch.length; j++) {
        const segment = batch[j];
        const embedding = result.embeddings[j];

        await updateSegmentEmbedding(schemaName, segment.id, embedding);

        processedCount++;

        // Update progress in DB periodically (every N segments)
        if (
          processedCount % PROGRESS_UPDATE_INTERVAL === 0 ||
          processedCount === validSegments.length
        ) {
          const progress = Math.round((processedCount / validSegments.length) * 100);
          await job.updateProgress(progress);

          await updateSource(schemaName, sourceId, { processingProgress: progress });
        }
      }
    }

    jobLog.info({ processedCount }, 'All segments vectorized');
    await job.updateProgress(95);

    // Mark source as COMPLETED and clear progress fields
    // Only reset summaryStatus if we're going to regenerate summaries
    await updateSource(schemaName, sourceId, {
      status: 'COMPLETED',
      processingStep: null,
      processingProgress: 0,
      processingStartedAt: null,
      ...(skipSummary ? {} : { summaryStatus: 'PENDING' }),
    });

    // Queue summary generation (unless skipped for migrations)
    if (skipSummary) {
      jobLog.info({ sourceId }, 'Skipping summary generation (migration mode)');
    } else {
      jobLog.info({ sourceId }, 'Queueing summary generation');
      await summaryGenerationQueue.add(
        `summary-source-${sourceId}`,
        { sourceId, schemaName },
        { jobId: `summary-source-${sourceId}-${Date.now()}` }
      );
    }

    const duration = Date.now() - startTime;
    jobLog.info({ duration }, 'Vectorization complete');
    await job.updateProgress(100);
  } catch (error) {
    jobLog.error({ error }, 'Vectorization failed');

    // Update source status to FAILED
    await updateSource(schemaName, sourceId, { status: 'FAILED' });

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
