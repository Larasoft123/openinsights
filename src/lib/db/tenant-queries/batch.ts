import { withTenantSchema } from '../tenant';
import type { TenantSegment } from './types';
import { toCamelCase, rowsToCamelCase } from './utils';

// ============================================
// BATCH OPERATIONS (for efficiency)
// ============================================

/**
 * Create multiple segments at once (used during transcription).
 */
export async function createSegmentsBatch(
  schemaName: string,
  segments: Array<{
    sourceId: string;
    content: string;
    startTime: number;
    endTime: number;
    speakerId?: string | null;
  }>
): Promise<TenantSegment[]> {
  if (segments.length === 0) return [];

  return withTenantSchema(schemaName, async (client) => {
    const values: unknown[] = [];
    const placeholders: string[] = [];
    let paramIndex = 1;

    for (const seg of segments) {
      placeholders.push(
        `($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++})`
      );
      values.push(seg.sourceId, seg.content, seg.startTime, seg.endTime, seg.speakerId || null);
    }

    const result = await client.query(
      `INSERT INTO transcript_segments (source_id, content, start_time, end_time, speaker_id)
       VALUES ${placeholders.join(', ')}
       RETURNING id, source_id, content, start_time, end_time, speaker_id, created_at, updated_at`,
      values
    );
    return rowsToCamelCase(result.rows) as TenantSegment[];
  });
}

/**
 * Update embedding for a segment.
 */
export async function updateSegmentEmbedding(
  schemaName: string,
  segmentId: string,
  embedding: number[]
): Promise<void> {
  return withTenantSchema(schemaName, async (client) => {
    const embeddingStr = `[${embedding.join(',')}]`;
    await client.query(`UPDATE transcript_segments SET embedding = $1::vector WHERE id = $2`, [
      embeddingStr,
      segmentId,
    ]);
  });
}

/**
 * Clear embedding for a segment (used before re-vectorization).
 */
export async function clearSegmentEmbedding(schemaName: string, segmentId: string): Promise<void> {
  return withTenantSchema(schemaName, async (client) => {
    await client.query(`UPDATE transcript_segments SET embedding = NULL WHERE id = $1`, [
      segmentId,
    ]);
  });
}

/**
 * Verify a segment belongs to a source.
 */
export async function verifySegmentBelongsToSource(
  schemaName: string,
  segmentId: string,
  sourceId: string
): Promise<TenantSegment | null> {
  return withTenantSchema(schemaName, async (client) => {
    const result = await client.query(
      `SELECT id, source_id, content, start_time, end_time, speaker_id, created_at, updated_at
       FROM transcript_segments
       WHERE id = $1 AND source_id = $2`,
      [segmentId, sourceId]
    );
    if (result.rows.length === 0) return null;
    return toCamelCase(result.rows[0]) as TenantSegment;
  });
}

/**
 * Get segment with highlight count.
 */
export async function getSegmentWithHighlightCount(
  schemaName: string,
  segmentId: string,
  sourceId: string
): Promise<(TenantSegment & { _count: { highlights: number } }) | null> {
  return withTenantSchema(schemaName, async (client) => {
    const result = await client.query(
      `SELECT ts.id, ts.source_id, ts.content, ts.start_time, ts.end_time, ts.speaker_id,
              ts.created_at, ts.updated_at,
              (SELECT COUNT(*) FROM highlights h WHERE h.segment_id = ts.id) as highlight_count
       FROM transcript_segments ts
       WHERE ts.id = $1 AND ts.source_id = $2`,
      [segmentId, sourceId]
    );
    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    return {
      id: row.id,
      sourceId: row.source_id,
      content: row.content,
      startTime: row.start_time,
      endTime: row.end_time,
      speakerId: row.speaker_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      _count: { highlights: parseInt(row.highlight_count, 10) },
    };
  });
}

/**
 * Semantic search on transcript segments.
 */
export async function searchSegmentsByEmbedding(
  schemaName: string,
  queryEmbedding: number[],
  options: {
    projectId?: string;
    sourceIds?: string[];
    limit?: number;
    threshold?: number;
  }
): Promise<Array<TenantSegment & { similarity: number; sourceTitle: string }>> {
  return withTenantSchema(schemaName, async (client) => {
    const embeddingStr = `[${queryEmbedding.join(',')}]`;
    let whereClause = 'ts.embedding IS NOT NULL';
    const values: unknown[] = [embeddingStr];
    let paramIndex = 2;

    if (options.projectId) {
      whereClause += ` AND s.project_id = $${paramIndex++}`;
      values.push(options.projectId);
    }
    if (options.sourceIds && options.sourceIds.length > 0) {
      whereClause += ` AND ts.source_id = ANY($${paramIndex++})`;
      values.push(options.sourceIds);
    }

    const limit = options.limit || 20;
    const threshold = options.threshold || 0.15;

    const result = await client.query(
      `SELECT ts.id, ts.source_id, ts.content, ts.start_time, ts.end_time, ts.speaker_id,
              ts.created_at, ts.updated_at, s.title as source_title,
              1 - (ts.embedding <=> $1::vector) as similarity
       FROM transcript_segments ts
       JOIN sources s ON s.id = ts.source_id
       WHERE ${whereClause}
         AND 1 - (ts.embedding <=> $1::vector) > ${threshold}
       ORDER BY similarity DESC
       LIMIT ${limit}`,
      values
    );

    return result.rows.map((row) => ({
      id: row.id,
      sourceId: row.source_id,
      content: row.content,
      startTime: row.start_time,
      endTime: row.end_time,
      speakerId: row.speaker_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      similarity: row.similarity,
      sourceTitle: row.source_title,
    }));
  });
}
