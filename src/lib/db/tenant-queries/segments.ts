import { withTenantSchema } from '../tenant';
import type { TenantSegment } from './types';
import { toCamelCase, rowsToCamelCase } from './utils';

// ============================================
// SEGMENT QUERIES
// ============================================

export async function listSegments(schemaName: string, sourceId: string): Promise<TenantSegment[]> {
  return withTenantSchema(schemaName, async (client) => {
    const result = await client.query(
      `SELECT id, source_id, content, start_time, end_time, speaker_id, created_at, updated_at
       FROM transcript_segments
       WHERE source_id = $1
       ORDER BY start_time ASC`,
      [sourceId]
    );
    return rowsToCamelCase(result.rows) as TenantSegment[];
  });
}

export async function getSegmentById(
  schemaName: string,
  segmentId: string
): Promise<TenantSegment | null> {
  return withTenantSchema(schemaName, async (client) => {
    const result = await client.query(
      `SELECT id, source_id, content, start_time, end_time, speaker_id, created_at, updated_at
       FROM transcript_segments
       WHERE id = $1`,
      [segmentId]
    );
    if (result.rows.length === 0) return null;
    return toCamelCase(result.rows[0]) as TenantSegment;
  });
}

export async function createSegment(
  schemaName: string,
  data: {
    sourceId: string;
    content: string;
    startTime: number;
    endTime: number;
    speakerId?: string | null;
  }
): Promise<TenantSegment> {
  return withTenantSchema(schemaName, async (client) => {
    const result = await client.query(
      `INSERT INTO transcript_segments (source_id, content, start_time, end_time, speaker_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, source_id, content, start_time, end_time, speaker_id, created_at, updated_at`,
      [data.sourceId, data.content, data.startTime, data.endTime, data.speakerId || null]
    );
    return toCamelCase(result.rows[0]) as TenantSegment;
  });
}

export async function updateSegment(
  schemaName: string,
  segmentId: string,
  data: Partial<{
    content: string;
    startTime: number;
    endTime: number;
    speakerId: string | null;
  }>
): Promise<TenantSegment | null> {
  return withTenantSchema(schemaName, async (client) => {
    const setClauses: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (data.content !== undefined) {
      setClauses.push(`content = $${paramIndex++}`);
      values.push(data.content);
    }
    if (data.startTime !== undefined) {
      setClauses.push(`start_time = $${paramIndex++}`);
      values.push(data.startTime);
    }
    if (data.endTime !== undefined) {
      setClauses.push(`end_time = $${paramIndex++}`);
      values.push(data.endTime);
    }
    if (data.speakerId !== undefined) {
      setClauses.push(`speaker_id = $${paramIndex++}`);
      values.push(data.speakerId);
    }

    if (setClauses.length === 0) return null;

    values.push(segmentId);
    const result = await client.query(
      `UPDATE transcript_segments SET ${setClauses.join(', ')} WHERE id = $${paramIndex}
       RETURNING id, source_id, content, start_time, end_time, speaker_id, created_at, updated_at`,
      values
    );
    if (result.rows.length === 0) return null;
    return toCamelCase(result.rows[0]) as TenantSegment;
  });
}

export async function deleteSegment(schemaName: string, segmentId: string): Promise<boolean> {
  return withTenantSchema(schemaName, async (client) => {
    const result = await client.query(`DELETE FROM transcript_segments WHERE id = $1`, [segmentId]);
    return result.rowCount !== null && result.rowCount > 0;
  });
}

export async function countSegments(schemaName: string, sourceId: string): Promise<number> {
  return withTenantSchema(schemaName, async (client) => {
    const result = await client.query(
      `SELECT COUNT(*) FROM transcript_segments WHERE source_id = $1`,
      [sourceId]
    );
    return parseInt(result.rows[0].count, 10);
  });
}
