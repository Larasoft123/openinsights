import { withTenantSchema } from '../tenant';
import type { TenantHighlight, TenantTag, TenantSegment, TenantTheme } from './types';
import { toCamelCase, rowsToCamelCase } from './utils';

// ============================================
// HIGHLIGHT QUERIES
// ============================================

export interface HighlightWithSource {
  id: string;
  segmentId: string;
  tagId: string;
  note: string | null;
  selectedText: string | null;
  createdAt: Date;
  updatedAt: Date;
  tag: {
    id: string;
    name: string;
    color: string;
  };
  segment: {
    id: string;
    content: string;
    startTime: number;
    endTime: number;
    speakerId: string | null;
  };
  source: {
    id: string;
    title: string;
    fileUrl: string | null;
  };
}

export async function listHighlights(
  schemaName: string,
  options: {
    sourceId?: string;
    projectId?: string;
    tagIds?: string[];
  }
): Promise<HighlightWithSource[]> {
  return withTenantSchema(schemaName, async (client) => {
    let whereClause = 's.deleted_at IS NULL';
    const values: unknown[] = [];
    let paramIndex = 1;

    if (options.sourceId) {
      whereClause += ` AND ts.source_id = $${paramIndex++}`;
      values.push(options.sourceId);
    }
    if (options.projectId) {
      whereClause += ` AND s.project_id = $${paramIndex++}`;
      values.push(options.projectId);
    }
    if (options.tagIds && options.tagIds.length > 0) {
      whereClause += ` AND h.tag_id = ANY($${paramIndex++})`;
      values.push(options.tagIds);
    }

    const result = await client.query(
      `SELECT h.id, h.segment_id, h.tag_id, h.note, h.selected_text, h.created_at, h.updated_at,
              t.id as tag_id, t.name as tag_name, t.color as tag_color,
              ts.content as segment_content, ts.start_time as segment_start_time,
              ts.end_time as segment_end_time, ts.speaker_id as segment_speaker_id,
              s.id as source_id, s.title as source_title, s.file_url as source_file_url
       FROM highlights h
       JOIN tags t ON t.id = h.tag_id
       JOIN transcript_segments ts ON ts.id = h.segment_id
       JOIN sources s ON s.id = ts.source_id
       WHERE ${whereClause}
       ORDER BY h.created_at DESC`,
      values
    );

    return result.rows.map((row) => ({
      id: row.id,
      segmentId: row.segment_id,
      tagId: row.tag_id,
      note: row.note,
      selectedText: row.selected_text,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      tag: {
        id: row.tag_id,
        name: row.tag_name,
        color: row.tag_color,
      },
      segment: {
        id: row.segment_id,
        content: row.segment_content,
        startTime: row.segment_start_time,
        endTime: row.segment_end_time,
        speakerId: row.segment_speaker_id,
      },
      source: {
        id: row.source_id,
        title: row.source_title,
        fileUrl: row.source_file_url,
      },
    }));
  });
}

export async function getHighlightById(
  schemaName: string,
  highlightId: string
): Promise<TenantHighlight | null> {
  return withTenantSchema(schemaName, async (client) => {
    const result = await client.query(`SELECT * FROM highlights WHERE id = $1`, [highlightId]);
    if (result.rows.length === 0) return null;
    return toCamelCase(result.rows[0]) as TenantHighlight;
  });
}

export async function createHighlight(
  schemaName: string,
  data: {
    segmentId: string;
    tagId: string;
    note?: string | null;
    selectedText?: string | null;
  }
): Promise<TenantHighlight> {
  return withTenantSchema(schemaName, async (client) => {
    const result = await client.query(
      `INSERT INTO highlights (segment_id, tag_id, note, selected_text)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [data.segmentId, data.tagId, data.note || null, data.selectedText || null]
    );
    return toCamelCase(result.rows[0]) as TenantHighlight;
  });
}

export interface HighlightWithTagAndSegment extends TenantHighlight {
  tag: TenantTag;
  segment: TenantSegment;
}

/**
 * Create highlight and return with tag and segment included.
 */
export async function createHighlightWithRelations(
  schemaName: string,
  data: {
    segmentId: string;
    tagId: string;
    note?: string | null;
    selectedText?: string | null;
  }
): Promise<HighlightWithTagAndSegment> {
  return withTenantSchema(schemaName, async (client) => {
    // Create highlight
    const highlightResult = await client.query(
      `INSERT INTO highlights (segment_id, tag_id, note, selected_text)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [data.segmentId, data.tagId, data.note || null, data.selectedText || null]
    );
    const h = highlightResult.rows[0];

    // Get tag
    const tagResult = await client.query(`SELECT * FROM tags WHERE id = $1`, [data.tagId]);
    const t = tagResult.rows[0];

    // Get segment
    const segmentResult = await client.query(
      `SELECT id, source_id, content, start_time, end_time, speaker_id, created_at, updated_at
       FROM transcript_segments WHERE id = $1`,
      [data.segmentId]
    );
    const s = segmentResult.rows[0];

    return {
      id: h.id,
      segmentId: h.segment_id,
      tagId: h.tag_id,
      note: h.note,
      selectedText: h.selected_text,
      createdAt: h.created_at,
      updatedAt: h.updated_at,
      tag: {
        id: t.id,
        projectId: t.project_id,
        name: t.name,
        color: t.color,
        description: t.description,
        createdAt: t.created_at,
        updatedAt: t.updated_at,
      },
      segment: {
        id: s.id,
        sourceId: s.source_id,
        content: s.content,
        startTime: s.start_time,
        endTime: s.end_time,
        speakerId: s.speaker_id,
        createdAt: s.created_at,
        updatedAt: s.updated_at,
      },
    };
  });
}

/**
 * Get highlights for a source ordered by segment start time.
 */
export async function listHighlightsBySource(
  schemaName: string,
  sourceId: string
): Promise<HighlightWithTagAndSegment[]> {
  return withTenantSchema(schemaName, async (client) => {
    const result = await client.query(
      `SELECT h.id, h.segment_id, h.tag_id, h.note, h.selected_text, h.created_at, h.updated_at,
              t.id as tag_id, t.project_id as tag_project_id, t.name as tag_name,
              t.color as tag_color, t.description as tag_description,
              t.created_at as tag_created_at, t.updated_at as tag_updated_at,
              s.id as segment_id_rel, s.source_id as segment_source_id, s.content as segment_content,
              s.start_time as segment_start_time, s.end_time as segment_end_time,
              s.speaker_id as segment_speaker_id, s.created_at as segment_created_at,
              s.updated_at as segment_updated_at
       FROM highlights h
       JOIN tags t ON t.id = h.tag_id
       JOIN transcript_segments s ON s.id = h.segment_id
       WHERE s.source_id = $1
       ORDER BY s.start_time ASC`,
      [sourceId]
    );

    return result.rows.map((row) => ({
      id: row.id,
      segmentId: row.segment_id,
      tagId: row.tag_id,
      note: row.note,
      selectedText: row.selected_text,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      tag: {
        id: row.tag_id,
        projectId: row.tag_project_id,
        name: row.tag_name,
        color: row.tag_color,
        description: row.tag_description,
        createdAt: row.tag_created_at,
        updatedAt: row.tag_updated_at,
      },
      segment: {
        id: row.segment_id_rel,
        sourceId: row.segment_source_id,
        content: row.segment_content,
        startTime: row.segment_start_time,
        endTime: row.segment_end_time,
        speakerId: row.segment_speaker_id,
        createdAt: row.segment_created_at,
        updatedAt: row.segment_updated_at,
      },
    }));
  });
}

export async function updateHighlight(
  schemaName: string,
  highlightId: string,
  data: Partial<{ note: string | null; selectedText: string | null }>
): Promise<TenantHighlight | null> {
  return withTenantSchema(schemaName, async (client) => {
    const setClauses: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (data.note !== undefined) {
      setClauses.push(`note = $${paramIndex++}`);
      values.push(data.note);
    }
    if (data.selectedText !== undefined) {
      setClauses.push(`selected_text = $${paramIndex++}`);
      values.push(data.selectedText);
    }

    if (setClauses.length === 0) return null;

    values.push(highlightId);
    const result = await client.query(
      `UPDATE highlights SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    if (result.rows.length === 0) return null;
    return toCamelCase(result.rows[0]) as TenantHighlight;
  });
}

export async function deleteHighlight(schemaName: string, highlightId: string): Promise<boolean> {
  return withTenantSchema(schemaName, async (client) => {
    const result = await client.query(`DELETE FROM highlights WHERE id = $1`, [highlightId]);
    return result.rowCount !== null && result.rowCount > 0;
  });
}

// ============================================
// HIGHLIGHT-THEME QUERIES
// ============================================

export async function addHighlightToTheme(
  schemaName: string,
  highlightId: string,
  themeId: string
): Promise<void> {
  return withTenantSchema(schemaName, async (client) => {
    await client.query(
      `INSERT INTO highlight_themes (highlight_id, theme_id) VALUES ($1, $2)
       ON CONFLICT (highlight_id, theme_id) DO NOTHING`,
      [highlightId, themeId]
    );
  });
}

export async function removeHighlightFromTheme(
  schemaName: string,
  highlightId: string,
  themeId: string
): Promise<boolean> {
  return withTenantSchema(schemaName, async (client) => {
    const result = await client.query(
      `DELETE FROM highlight_themes WHERE highlight_id = $1 AND theme_id = $2`,
      [highlightId, themeId]
    );
    return result.rowCount !== null && result.rowCount > 0;
  });
}

export async function highlightThemeExists(
  schemaName: string,
  highlightId: string,
  themeId: string
): Promise<boolean> {
  return withTenantSchema(schemaName, async (client) => {
    const result = await client.query(
      `SELECT 1 FROM highlight_themes WHERE highlight_id = $1 AND theme_id = $2`,
      [highlightId, themeId]
    );
    return result.rowCount !== null && result.rowCount > 0;
  });
}

export async function getHighlightThemes(
  schemaName: string,
  highlightId: string
): Promise<TenantTheme[]> {
  return withTenantSchema(schemaName, async (client) => {
    const result = await client.query(
      `SELECT t.* FROM themes t
       JOIN highlight_themes ht ON ht.theme_id = t.id
       WHERE ht.highlight_id = $1`,
      [highlightId]
    );
    return rowsToCamelCase(result.rows) as TenantTheme[];
  });
}
