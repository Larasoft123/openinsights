import { PrismaClient } from '@prisma/client';
import { prisma as defaultPrisma } from '../db';
import { getEmbeddingProvider } from '../ai';
import { logger } from '../logger';

const log = logger.child({ service: 'search' });

// Minimum similarity threshold to filter noise (0.75 = 75% similar)
const DEFAULT_MIN_SIMILARITY = 0.75;

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
  projectId: string;
  query: string;
  limit?: number;
  minSimilarity?: number;
  /** Pre-computed embedding for the query (used in tests to avoid API calls) */
  queryEmbedding?: number[];
  /** Custom Prisma client (used in tests to use test database) */
  prismaClient?: PrismaClient;
}

/**
 * Perform semantic search across transcript segments in a project
 *
 * Uses OpenAI embeddings and pgvector cosine similarity to find
 * segments that are semantically similar to the query.
 *
 * @param options - Search options including projectId and query
 * @returns Array of search results ranked by similarity (descending)
 */
export async function semanticSearch(options: SemanticSearchOptions): Promise<SearchResult[]> {
  const {
    projectId,
    query,
    limit = DEFAULT_LIMIT,
    minSimilarity = DEFAULT_MIN_SIMILARITY,
    queryEmbedding: providedEmbedding,
    prismaClient = defaultPrisma,
  } = options;

  const prisma = prismaClient;

  // Return empty for empty/whitespace queries
  if (!query.trim()) {
    return [];
  }

  log.info({ projectId, queryLength: query.length }, 'Starting semantic search');

  try {
    // Use provided embedding or generate one via OpenAI
    let queryEmbedding: number[];
    if (providedEmbedding) {
      queryEmbedding = providedEmbedding;
    } else {
      const provider = getEmbeddingProvider();
      const embeddingResult = await provider.embed([query]);

      if (embeddingResult.embeddings.length === 0) {
        log.warn('No embedding generated for query');
        return [];
      }
      queryEmbedding = embeddingResult.embeddings[0];
    }

    const vectorString = `[${queryEmbedding.join(',')}]`;

    // Query pgvector using cosine similarity
    // The <=> operator returns cosine distance, so we calculate similarity as 1 - distance
    // Results are ordered by distance (ascending) which equals similarity descending
    const results = await prisma.$queryRaw<
      Array<{
        segment_id: string;
        content: string;
        start_time: number;
        end_time: number;
        speaker_id: string | null;
        source_id: string;
        source_title: string;
        similarity: number;
      }>
    >`
      SELECT
        ts.id as segment_id,
        ts.content,
        ts.start_time,
        ts.end_time,
        ts.speaker_id,
        s.id as source_id,
        s.title as source_title,
        1 - (ts.embedding <=> ${vectorString}::vector) as similarity
      FROM transcript_segments ts
      JOIN sources s ON ts.source_id = s.id
      WHERE s.project_id = ${projectId}
        AND ts.embedding IS NOT NULL
        AND 1 - (ts.embedding <=> ${vectorString}::vector) > ${minSimilarity}
      ORDER BY ts.embedding <=> ${vectorString}::vector
      LIMIT ${limit}
    `;

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
 * Get highlights for a project with optional tag filtering
 */
export async function getProjectHighlights(
  projectId: string,
  options?: { tagIds?: string[]; sourceIds?: string[] }
) {
  const { tagIds, sourceIds } = options || {};

  const highlights = await defaultPrisma.highlight.findMany({
    where: {
      segment: {
        source: {
          projectId,
          ...(sourceIds && sourceIds.length > 0 ? { id: { in: sourceIds } } : {}),
        },
      },
      ...(tagIds && tagIds.length > 0 ? { tagId: { in: tagIds } } : {}),
    },
    include: {
      tag: true,
      segment: {
        include: {
          source: {
            select: {
              id: true,
              title: true,
              fileUrl: true,
            },
          },
        },
      },
    },
    orderBy: [{ tag: { name: 'asc' } }, { segment: { startTime: 'asc' } }],
  });

  return highlights;
}

/**
 * Get all tags for a project with highlight counts
 */
export async function getProjectTagsWithCounts(projectId: string) {
  const tags = await defaultPrisma.tag.findMany({
    where: { projectId },
    include: {
      _count: {
        select: { highlights: true },
      },
    },
    orderBy: { name: 'asc' },
  });

  return tags.map((tag: (typeof tags)[number]) => ({
    ...tag,
    highlightCount: tag._count.highlights,
  }));
}
