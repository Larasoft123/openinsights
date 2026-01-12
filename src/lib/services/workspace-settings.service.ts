import { prisma } from '../db';
import { withTenantSchema } from '../db/tenant';
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
 * Get workspace AI configuration by source ID (tenant-aware version)
 *
 * Looks up the workspace settings via: source → project → workspace
 * Returns the AI config including API keys (for workers)
 *
 * Used by workers to respect per-workspace settings.
 */
export async function getWorkspaceAIConfigBySourceId(
  schemaName: string,
  sourceId: string
): Promise<WorkspaceAIConfig | null> {
  try {
    // Use tenant schema to look up source -> project -> workspace
    const workspace = await withTenantSchema(schemaName, async (client) => {
      const result = await client.query(
        `SELECT w.ai_provider, w.openai_transcription_model, w.embedding_provider,
                w.gemini_api_key, w.openai_api_key, w.ollama_base_url
         FROM sources s
         JOIN projects p ON p.id = s.project_id
         JOIN workspaces w ON w.id = p.workspace_id
         WHERE s.id = $1`,
        [sourceId]
      );
      return result.rows[0] ?? null;
    });

    if (!workspace) {
      log.warn({ sourceId, schemaName }, 'Could not find workspace for source');
      return null;
    }

    const config: WorkspaceAIConfig = {
      aiProvider: workspace.ai_provider as WorkspaceAIConfig['aiProvider'],
      openaiTranscriptionModel:
        workspace.openai_transcription_model as WorkspaceAIConfig['openaiTranscriptionModel'],
      embeddingProvider: workspace.embedding_provider as WorkspaceAIConfig['embeddingProvider'],
      geminiApiKey: workspace.gemini_api_key,
      openaiApiKey: workspace.openai_api_key,
      ollamaBaseUrl: workspace.ollama_base_url,
    };

    log.debug({ sourceId, schemaName }, 'Retrieved workspace AI config');
    return config;
  } catch (error) {
    log.error({ error, sourceId, schemaName }, 'Failed to get workspace AI config');
    throw error;
  }
}

/**
 * Get workspace AI configuration by project ID
 *
 * Looks up the workspace settings via: project → workspace
 * Returns the AI config including API keys.
 *
 * Used by search service to respect per-workspace embedding settings.
 */
export async function getWorkspaceAIConfigByProjectId(
  projectId: string
): Promise<WorkspaceAIConfig | null> {
  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
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
    });

    if (!project?.workspace) {
      log.warn({ projectId }, 'Could not find workspace for project');
      return null;
    }

    const workspace = project.workspace;

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
    log.error({ error, projectId }, 'Failed to get workspace AI config by project');
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
 * Uses tenant schema.
 */
export async function getWorkspaceSettingsForDisplay(
  schemaName: string,
  workspaceId: string
): Promise<WorkspaceSettingsResponse | null> {
  try {
    const workspace = await withTenantSchema(schemaName, async (client) => {
      const result = await client.query(
        `SELECT ai_provider, openai_transcription_model, embedding_provider,
                gemini_api_key, openai_api_key, ollama_base_url
         FROM workspaces WHERE id = $1`,
        [workspaceId]
      );
      return result.rows[0] ?? null;
    });

    if (!workspace) {
      return null;
    }

    return {
      aiProvider: workspace.ai_provider,
      openaiTranscriptionModel: workspace.openai_transcription_model,
      embeddingProvider: workspace.embedding_provider,
      geminiApiKey: maskApiKey(workspace.gemini_api_key),
      openaiApiKey: maskApiKey(workspace.openai_api_key),
      ollamaBaseUrl: workspace.ollama_base_url,
      hasGeminiApiKey: !!workspace.gemini_api_key,
      hasOpenaiApiKey: !!workspace.openai_api_key,
    };
  } catch (error) {
    log.error({ error, workspaceId, schemaName }, 'Failed to get workspace settings for display');
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
 * Update workspace AI settings in tenant schema
 *
 * For API keys:
 * - undefined: don't change existing value
 * - null or empty string: clear the key
 * - non-empty string: set new key
 */
export async function updateWorkspaceAISettings(
  schemaName: string,
  workspaceId: string,
  settings: UpdateWorkspaceSettingsInput
): Promise<WorkspaceSettingsResponse & { migrationTriggered?: boolean }> {
  try {
    // Build SET clauses and values for the update
    const setClauses: string[] = [];
    const values: (string | null)[] = [];
    let paramIndex = 1;

    if (settings.aiProvider !== undefined) {
      setClauses.push(`ai_provider = $${paramIndex++}`);
      values.push(settings.aiProvider);
    }
    if (settings.openaiTranscriptionModel !== undefined) {
      setClauses.push(`openai_transcription_model = $${paramIndex++}`);
      values.push(settings.openaiTranscriptionModel);
    }
    if (settings.embeddingProvider !== undefined) {
      setClauses.push(`embedding_provider = $${paramIndex++}`);
      values.push(settings.embeddingProvider);
    }
    if (settings.geminiApiKey !== undefined) {
      setClauses.push(`gemini_api_key = $${paramIndex++}`);
      values.push(settings.geminiApiKey || null);
    }
    if (settings.openaiApiKey !== undefined) {
      setClauses.push(`openai_api_key = $${paramIndex++}`);
      values.push(settings.openaiApiKey || null);
    }
    if (settings.ollamaBaseUrl !== undefined) {
      setClauses.push(`ollama_base_url = $${paramIndex++}`);
      values.push(settings.ollamaBaseUrl || null);
    }

    // Always update updated_at
    setClauses.push(`updated_at = NOW()`);

    if (setClauses.length === 1) {
      // Only updated_at, nothing else to update - just return current settings
      return (await getWorkspaceSettingsForDisplay(schemaName, workspaceId))!;
    }

    // Add workspaceId as the last parameter
    values.push(workspaceId);

    const workspace = await withTenantSchema(schemaName, async (client) => {
      const result = await client.query(
        `UPDATE workspaces
         SET ${setClauses.join(', ')}
         WHERE id = $${paramIndex}
         RETURNING ai_provider, openai_transcription_model, embedding_provider,
                   gemini_api_key, openai_api_key, ollama_base_url`,
        values
      );
      return result.rows[0];
    });

    log.info({ workspaceId, schemaName }, 'Updated workspace AI settings');

    return {
      aiProvider: workspace.ai_provider,
      openaiTranscriptionModel: workspace.openai_transcription_model,
      embeddingProvider: workspace.embedding_provider,
      geminiApiKey: maskApiKey(workspace.gemini_api_key),
      openaiApiKey: maskApiKey(workspace.openai_api_key),
      ollamaBaseUrl: workspace.ollama_base_url,
      hasGeminiApiKey: !!workspace.gemini_api_key,
      hasOpenaiApiKey: !!workspace.openai_api_key,
      migrationTriggered: false, // TODO: Implement migration for tenant schema if needed
    };
  } catch (error) {
    log.error({ error, workspaceId, schemaName }, 'Failed to update workspace AI settings');
    throw error;
  }
}
