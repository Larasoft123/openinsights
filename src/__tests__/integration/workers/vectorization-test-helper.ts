/**
 * Test Helper for Vectorization Worker
 *
 * This helper exposes the worker's processJob function for integration testing.
 */

import { Job } from 'bullmq';
import { vectorizationJobSchema, VectorizationJobData } from '@/lib/queues/types';
import { summaryGenerationQueue } from '@/lib/queues/index';
import { getEmbeddingProviderWithOrgConfig, getEmbeddingDimensionsFromOrgConfig } from '@/lib/ai';
import { withTenantSchema } from '@/lib/db/tenant';
import { updateSource, updateSegmentEmbedding } from '@/lib/db/tenant-queries';
import {
  getOrganizationAIConfig,
  getDefaultOrganizationId,
} from '@/lib/services/organization-settings.service';

const BATCH_SIZE = 50;
const PROGRESS_UPDATE_INTERVAL = 10;

/**
 * Process a vectorization job - exported for testing
 * This mirrors the logic in vectorization.worker.ts processJob function
 */
export async function processVectorizationJob(job: Job<VectorizationJobData>): Promise<void> {
  // Validate job data with Zod
  const data = vectorizationJobSchema.parse(job.data);
  const { sourceId, segmentIds, skipSummary, schemaName } = data;

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
      return;
    }

    // Filter out segments with empty/whitespace-only content
    const validSegments = segments.filter((s) => s.content.trim().length > 0);

    if (validSegments.length === 0) {
      return;
    }

    await job.updateProgress(20);

    // Get organization AI configuration
    const organizationId = await getDefaultOrganizationId();
    const orgConfig = await getOrganizationAIConfig(organizationId);

    // Get embedding provider based on organization config
    const provider = getEmbeddingProviderWithOrgConfig(orgConfig || {});

    // Process in batches
    let processedCount = 0;

    for (let i = 0; i < validSegments.length; i += BATCH_SIZE) {
      const batch = validSegments.slice(i, i + BATCH_SIZE);
      const texts = batch.map((s) => s.content);

      // Generate embeddings
      const result = await provider.embed(texts);

      // Update segments with embeddings using tenant query
      for (let j = 0; j < batch.length; j++) {
        const segment = batch[j];
        const embedding = result.embeddings[j];

        await updateSegmentEmbedding(schemaName, segment.id, embedding);

        processedCount++;

        // Update progress periodically
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

    await job.updateProgress(95);

    // Mark source as COMPLETED
    await updateSource(schemaName, sourceId, {
      status: 'COMPLETED',
      processingStep: null,
      processingProgress: 0,
      processingStartedAt: null,
      ...(skipSummary ? {} : { summaryStatus: 'PENDING' }),
    });

    // Queue summary generation (unless skipped)
    if (!skipSummary) {
      await summaryGenerationQueue.add(
        `summary-source-${sourceId}`,
        { sourceId, schemaName },
        { jobId: `summary-source-${sourceId}-${Date.now()}` }
      );
    }

    await job.updateProgress(100);
  } catch (error) {
    // Update source status to FAILED
    await updateSource(schemaName, sourceId, { status: 'FAILED' });
    throw error;
  }
}
