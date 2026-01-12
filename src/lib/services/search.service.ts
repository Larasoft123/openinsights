import { getEmbeddingProviderWithConfig, getEmbeddingDimensionsWithConfig } from '../ai';
import { logger } from '../logger';
import { getEmbeddingColumnName } from '../utils';
import { withTenantSchema } from '../db/tenant';

const log = logger.child({ service: 'search' });

// Minimum similarity threshold to filter noise (0.4 = 40% similar)
// Balances relevance with recall; users can adjust via API parameter
export const DEFAULT_MIN_SIMILARITY = 0.4;

// Maximum results to return
const DEFAULT_LIMIT = 20;

export interface SearchResult {
  segmentId: string;
  content: string;
  startTime: number;
  endTime: number;
  speakerId: string | null;
  sourceId: string;
  sourceTitle: string;
  similarity: number;
}

export interface SemanticSearchOptions {
  schemaName: string;
  projectId: string;
  query: string;
  limit?: number;
  minSimilarity?: number;
  /** Pre-computed embedding for the query (used in tests to avoid API calls) */
  queryEmbedding?: number[];
}

/**
 * Perform semantic search across transcript segments in a project
 *
 * Uses OpenAI embeddings and pgvector cosine similarity to find
 * segments that are semantically similar to the query.
 *
 * @param options - Search options including schemaName, projectId and query
 * @returns Array of search results ranked by similarity (descending)
 */
export async function semanticSearch(options: SemanticSearchOptions): Promise<SearchResult[]> {
  const {
    schemaName,
    projectId,
    query,
    limit = DEFAULT_LIMIT,
    minSimilarity = DEFAULT_MIN_SIMILARITY,
    queryEmbedding: providedEmbedding,
  } = options;

  // Return empty for empty/whitespace queries
  if (!query.trim()) {
    return [];
  }

  log.info({ projectId, queryLength: query.length }, 'Starting semantic search');

  try {
    // Look up workspace AI configuration via tenant schema
    // We need to find a source in this project to get the workspace config
    const workspaceConfig = await withTenantSchema(schemaName, async (client) => {
      const result = await client.query(
        `SELECT w.ai_provider, w.openai_transcription_model, w.embedding_provider,
                w.gemini_api_key, w.openai_api_key, w.ollama_base_url
         FROM projects p
         JOIN workspaces w ON w.id = p.workspace_id
         WHERE p.id = $1`,
        [projectId]
      );
      if (result.rows.length === 0) return null;
      const row = result.rows[0];
      return {
        aiProvider: row.ai_provider,
        openaiTranscriptionModel: row.openai_transcription_model,
        embeddingProvider: row.embedding_provider,
        geminiApiKey: row.gemini_api_key,
        openaiApiKey: row.openai_api_key,
        ollamaBaseUrl: row.ollama_base_url,
      };
    });

    // Determine embedding dimension and column using workspace config
    const embeddingDimension = getEmbeddingDimensionsWithConfig(workspaceConfig);
    const embeddingColumn = getEmbeddingColumnName(embeddingDimension);

    // Use provided embedding or generate one via the configured provider
    let queryEmbedding: number[];
    if (providedEmbedding) {
      queryEmbedding = providedEmbedding;
    } else {
      const provider = getEmbeddingProviderWithConfig(workspaceConfig);
      const embeddingResult = await provider.embed([query]);

      if (embeddingResult.embeddings.length === 0) {
        log.warn('No embedding generated for query');
        return [];
      }
      queryEmbedding = embeddingResult.embeddings[0];
    }

    const vectorString = `[${queryEmbedding.join(',')}]`;

    // Query tenant schema using pgvector cosine similarity
    // The <=> operator returns cosine distance, so we calculate similarity as 1 - distance
    // Results are ordered by distance (ascending) which equals similarity descending
    const results = await withTenantSchema(schemaName, async (client) => {
      const result = await client.query(
        `SELECT
          ts.id as segment_id,
          ts.content,
          ts.start_time,
          ts.end_time,
          ts.speaker_id,
          s.id as source_id,
          s.title as source_title,
          1 - (ts.${embeddingColumn} <=> $1::vector) as similarity
        FROM transcript_segments ts
        JOIN sources s ON ts.source_id = s.id
        WHERE s.project_id = $2
          AND s.deleted_at IS NULL
          AND ts.${embeddingColumn} IS NOT NULL
          AND 1 - (ts.${embeddingColumn} <=> $1::vector) > $3
        ORDER BY ts.${embeddingColumn} <=> $1::vector
        LIMIT $4`,
        [vectorString, projectId, minSimilarity, limit]
      );
      return result.rows;
    });

    log.info({ projectId, resultCount: results.length }, 'Semantic search complete');

    // Transform to camelCase response
    return results.map((row) => ({
      segmentId: row.segment_id,
      content: row.content,
      startTime: row.start_time,
      endTime: row.end_time,
      speakerId: row.speaker_id,
      sourceId: row.source_id,
      sourceTitle: row.source_title,
      similarity: row.similarity,
    }));
  } catch (error) {
    log.error({ error, projectId }, 'Semantic search failed');
    throw error;
  }
}

/**
 * Get all tags for a project with highlight counts
 */
export async function getProjectTagsWithCounts(schemaName: string, projectId: string) {
  return withTenantSchema(schemaName, async (client) => {
    const result = await client.query(
      `SELECT t.id, t.name, t.color, t.description, t.created_at, t.updated_at,
              COUNT(h.id)::int as highlight_count
       FROM tags t
       LEFT JOIN highlights h ON h.tag_id = t.id
       WHERE t.project_id = $1
       GROUP BY t.id
       ORDER BY t.name ASC`,
      [projectId]
    );

    return result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      color: row.color,
      description: row.description,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      highlightCount: row.highlight_count,
    }));
  });
}
