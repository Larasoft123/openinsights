import { prisma } from '../db';
import type { WorkspaceAIConfig, EmbeddingProviderType } from '../ai/types';
import { logger } from '../logger';
import { vectorizationQueue } from '../queues';

const log = logger.child({ service: 'workspace-settings' });

/**
 * Mask an API key for display (show first 4 and last 4 chars)
 * e.g., "sk-1234567890abc123" → "sk-1...c123"
 */
function maskApiKey(key: string | null | undefined): string | null {
  if (!key) return null;
  if (key.length <= 8) return '****';
  return `${key.slice(0, 4)}...${key.slice(-4)}`;
}

/**
 * Get workspace AI configuration by source ID
 *
 * Looks up the workspace settings via: source → project → workspace
 * Returns the AI config including API keys (for workers)
 *
 * Used by workers to respect per-workspace settings.
 */
export async function getWorkspaceAIConfigBySourceId(
  sourceId: string
): Promise<WorkspaceAIConfig | null> {
  try {
    const source = await prisma.source.findUnique({
      where: { id: sourceId },
      select: {
        project: {
          select: {
            workspace: {
              select: {
                aiProvider: true,
                openaiTranscriptionModel: true,
                embeddingProvider: true,
                geminiApiKey: true,
                openaiApiKey: true,
                ollamaBaseUrl: true,
              },
            },
          },
        },
      },
    });

    if (!source?.project?.workspace) {
      log.warn({ sourceId }, 'Could not find workspace for source');
      return null;
    }

    const workspace = source.project.workspace;

    const config: WorkspaceAIConfig = {
      aiProvider: workspace.aiProvider as WorkspaceAIConfig['aiProvider'],
      openaiTranscriptionModel:
        workspace.openaiTranscriptionModel as WorkspaceAIConfig['openaiTranscriptionModel'],
      embeddingProvider: workspace.embeddingProvider as WorkspaceAIConfig['embeddingProvider'],
      geminiApiKey: workspace.geminiApiKey,
      openaiApiKey: workspace.openaiApiKey,
      ollamaBaseUrl: workspace.ollamaBaseUrl,
    };

    log.debug({ sourceId }, 'Retrieved workspace AI config');
    return config;
  } catch (error) {
    log.error({ error, sourceId }, 'Failed to get workspace AI config');
    throw error;
  }
}

/**
 * Get workspace AI configuration by workspace ID (for workers/internal use)
 *
 * Returns full config including API keys.
 */
export async function getWorkspaceAIConfigById(
  workspaceId: string
): Promise<WorkspaceAIConfig | null> {
  try {
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: {
        aiProvider: true,
        openaiTranscriptionModel: true,
        embeddingProvider: true,
        geminiApiKey: true,
        openaiApiKey: true,
        ollamaBaseUrl: true,
      },
    });

    if (!workspace) {
      return null;
    }

    return {
      aiProvider: workspace.aiProvider as WorkspaceAIConfig['aiProvider'],
      openaiTranscriptionModel:
        workspace.openaiTranscriptionModel as WorkspaceAIConfig['openaiTranscriptionModel'],
      embeddingProvider: workspace.embeddingProvider as WorkspaceAIConfig['embeddingProvider'],
      geminiApiKey: workspace.geminiApiKey,
      openaiApiKey: workspace.openaiApiKey,
      ollamaBaseUrl: workspace.ollamaBaseUrl,
    };
  } catch (error) {
    log.error({ error, workspaceId }, 'Failed to get workspace AI config');
    throw error;
  }
}

/**
 * Response type for settings API (with masked keys)
 */
export interface WorkspaceSettingsResponse {
  aiProvider: string | null;
  openaiTranscriptionModel: string | null;
  embeddingProvider: string | null;
  geminiApiKey: string | null; // Masked
  openaiApiKey: string | null; // Masked
  ollamaBaseUrl: string | null;
  // Flags to indicate if keys are configured
  hasGeminiApiKey: boolean;
  hasOpenaiApiKey: boolean;
}

/**
 * Get workspace settings for display (API response)
 *
 * Returns settings with masked API keys for security.
 * Use getWorkspaceAIConfigById for internal/worker use.
 */
export async function getWorkspaceSettingsForDisplay(
  workspaceId: string
): Promise<WorkspaceSettingsResponse | null> {
  try {
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: {
        aiProvider: true,
        openaiTranscriptionModel: true,
        embeddingProvider: true,
        geminiApiKey: true,
        openaiApiKey: true,
        ollamaBaseUrl: true,
      },
    });

    if (!workspace) {
      return null;
    }

    return {
      aiProvider: workspace.aiProvider,
      openaiTranscriptionModel: workspace.openaiTranscriptionModel,
      embeddingProvider: workspace.embeddingProvider,
      geminiApiKey: maskApiKey(workspace.geminiApiKey),
      openaiApiKey: maskApiKey(workspace.openaiApiKey),
      ollamaBaseUrl: workspace.ollamaBaseUrl,
      hasGeminiApiKey: !!workspace.geminiApiKey,
      hasOpenaiApiKey: !!workspace.openaiApiKey,
    };
  } catch (error) {
    log.error({ error, workspaceId }, 'Failed to get workspace settings for display');
    throw error;
  }
}

/**
 * Update input type for settings API
 */
export interface UpdateWorkspaceSettingsInput {
  aiProvider?: string | null;
  openaiTranscriptionModel?: string | null;
  embeddingProvider?: string | null;
  // For keys: undefined = don't change, null = clear, string = set new value
  geminiApiKey?: string | null;
  openaiApiKey?: string | null;
  ollamaBaseUrl?: string | null;
}

// Embedding dimensions by provider
const EMBEDDING_DIMENSIONS: Record<EmbeddingProviderType, number> = {
  openai: 1536,
  gemini: 768,
  ollama: 768,
};

/**
 * Get the effective embedding provider (workspace setting or env default)
 */
function getEffectiveEmbeddingProvider(workspaceProvider: string | null): EmbeddingProviderType {
  if (workspaceProvider && workspaceProvider in EMBEDDING_DIMENSIONS) {
    return workspaceProvider as EmbeddingProviderType;
  }
  // Fall back to environment variable or default
  const envProvider = process.env.EMBEDDING_PROVIDER as EmbeddingProviderType;
  if (envProvider && envProvider in EMBEDDING_DIMENSIONS) {
    return envProvider;
  }
  return 'openai'; // Default
}

/**
 * Migrate embedding column when provider dimensions change.
 * This drops the existing column and recreates it with new dimensions.
 * All existing embeddings will be lost and need re-vectorization.
 */
async function migrateEmbeddingColumn(
  workspaceId: string,
  newDimension: number
): Promise<{ sourcesQueued: number; segmentsQueued: number }> {
  log.warn(
    { workspaceId, newDimension },
    'Starting embedding column migration - all embeddings will be dropped'
  );

  // Drop and recreate the embedding column with new dimensions
  await prisma.$executeRaw`DROP INDEX IF EXISTS transcript_segments_embedding_hnsw_idx`;
  await prisma.$executeRaw`ALTER TABLE transcript_segments DROP COLUMN IF EXISTS embedding`;
  await prisma.$executeRawUnsafe(
    `ALTER TABLE transcript_segments ADD COLUMN embedding vector(${newDimension})`
  );
  await prisma.$executeRawUnsafe(`
    CREATE INDEX transcript_segments_embedding_hnsw_idx
      ON transcript_segments USING hnsw (embedding vector_cosine_ops)
      WITH (m = 16, ef_construction = 64)
  `);

  log.info({ newDimension }, 'Embedding column recreated with new dimensions');

  // Queue all sources in the workspace for re-vectorization
  const sources = await prisma.source.findMany({
    where: {
      project: { workspaceId },
      status: 'COMPLETED',
    },
    select: {
      id: true,
      segments: { select: { id: true } },
    },
  });

  let totalSegments = 0;
  for (const source of sources) {
    if (source.segments.length > 0) {
      const segmentIds = source.segments.map((s) => s.id);
      totalSegments += segmentIds.length;

      await vectorizationQueue.add(`migration-vectorization-${source.id}`, {
        sourceId: source.id,
        segmentIds,
        skipSummary: true, // Don't regenerate summaries during migration
      });
    }
  }

  log.info(
    { workspaceId, sourcesQueued: sources.length, segmentsQueued: totalSegments },
    'Queued sources for re-vectorization after embedding migration'
  );

  return { sourcesQueued: sources.length, segmentsQueued: totalSegments };
}

/**
 * Update workspace AI settings
 *
 * For API keys:
 * - undefined: don't change existing value
 * - null or empty string: clear the key
 * - non-empty string: set new key
 *
 * When embedding provider changes and dimensions differ (e.g., openai→gemini),
 * automatically migrates the embedding column and queues re-vectorization.
 */
export async function updateWorkspaceAISettings(
  workspaceId: string,
  settings: UpdateWorkspaceSettingsInput
): Promise<WorkspaceSettingsResponse & { migrationTriggered?: boolean }> {
  try {
    // Check if embedding provider is changing and if migration is needed
    let migrationTriggered = false;

    if (settings.embeddingProvider !== undefined) {
      // Get current workspace settings to compare
      const currentWorkspace = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { embeddingProvider: true },
      });

      const oldProvider = getEffectiveEmbeddingProvider(
        currentWorkspace?.embeddingProvider ?? null
      );
      const newProvider = getEffectiveEmbeddingProvider(settings.embeddingProvider);
      const oldDimension = EMBEDDING_DIMENSIONS[oldProvider];
      const newDimension = EMBEDDING_DIMENSIONS[newProvider];

      if (oldDimension !== newDimension) {
        log.info(
          { workspaceId, oldProvider, newProvider, oldDimension, newDimension },
          'Embedding dimension change detected - triggering migration'
        );

        // Perform migration
        await migrateEmbeddingColumn(workspaceId, newDimension);
        migrationTriggered = true;
      }
    }

    // Build update data, only including fields that were provided
    const updateData: Record<string, string | null> = {};

    if (settings.aiProvider !== undefined) {
      updateData.aiProvider = settings.aiProvider;
    }
    if (settings.openaiTranscriptionModel !== undefined) {
      updateData.openaiTranscriptionModel = settings.openaiTranscriptionModel;
    }
    if (settings.embeddingProvider !== undefined) {
      updateData.embeddingProvider = settings.embeddingProvider;
    }

    // Handle API keys - empty string means clear
    if (settings.geminiApiKey !== undefined) {
      updateData.geminiApiKey = settings.geminiApiKey || null;
    }
    if (settings.openaiApiKey !== undefined) {
      updateData.openaiApiKey = settings.openaiApiKey || null;
    }
    if (settings.ollamaBaseUrl !== undefined) {
      updateData.ollamaBaseUrl = settings.ollamaBaseUrl || null;
    }

    const workspace = await prisma.workspace.update({
      where: { id: workspaceId },
      data: updateData,
      select: {
        aiProvider: true,
        openaiTranscriptionModel: true,
        embeddingProvider: true,
        geminiApiKey: true,
        openaiApiKey: true,
        ollamaBaseUrl: true,
      },
    });

    log.info({ workspaceId, migrationTriggered }, 'Updated workspace AI settings');

    return {
      aiProvider: workspace.aiProvider,
      openaiTranscriptionModel: workspace.openaiTranscriptionModel,
      embeddingProvider: workspace.embeddingProvider,
      geminiApiKey: maskApiKey(workspace.geminiApiKey),
      openaiApiKey: maskApiKey(workspace.openaiApiKey),
      ollamaBaseUrl: workspace.ollamaBaseUrl,
      hasGeminiApiKey: !!workspace.geminiApiKey,
      hasOpenaiApiKey: !!workspace.openaiApiKey,
      migrationTriggered,
    };
  } catch (error) {
    log.error({ error, workspaceId }, 'Failed to update workspace AI settings');
    throw error;
  }
}
