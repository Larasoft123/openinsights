import { withTenantSchema } from '../tenant';
import type { TenantSource } from './types';
import { toCamelCase } from './utils';

// ============================================
// SOURCE QUERIES
// ============================================

export interface SourceWithTags extends TenantSource {
  tags: Array<{ id: string; name: string; color: string }>;
  highlightCount: number;
  segmentsCount: number;
}

export async function listSources(
  schemaName: string,
  projectId: string,
  options?: { includeDeleted?: boolean }
): Promise<TenantSource[]> {
  return withTenantSchema(schemaName, async (client) => {
    const deletedClause = options?.includeDeleted ? '' : 'AND s.deleted_at IS NULL';
    const result = await client.query(
      `SELECT s.*,
              (SELECT COUNT(*) FROM transcript_segments ts WHERE ts.source_id = s.id) as segment_count
       FROM sources s
       WHERE s.project_id = $1 ${deletedClause}
       ORDER BY s.created_at DESC`,
      [projectId]
    );
    return result.rows.map((row) => {
      const source = toCamelCase(row) as TenantSource & { segmentCount: string };
      return {
        ...source,
        _count: { segments: parseInt(source.segmentCount, 10) },
      };
    });
  });
}

export async function listTrashedSources(
  schemaName: string,
  projectId: string
): Promise<TenantSource[]> {
  return withTenantSchema(schemaName, async (client) => {
    const result = await client.query(
      `SELECT s.*,
              (SELECT COUNT(*) FROM transcript_segments ts WHERE ts.source_id = s.id) as segment_count
       FROM sources s
       WHERE s.project_id = $1 AND s.deleted_at IS NOT NULL
       ORDER BY s.deleted_at DESC`,
      [projectId]
    );
    return result.rows.map((row) => {
      const source = toCamelCase(row) as TenantSource & { segmentCount: string };
      return {
        ...source,
        _count: { segments: parseInt(source.segmentCount, 10) },
      };
    });
  });
}

/**
 * List sources with aggregated tag information (derived from highlights).
 * Used by project sources list API.
 */
export async function listSourcesWithTags(
  schemaName: string,
  projectId: string
): Promise<{ sources: SourceWithTags[]; trashedCount: number }> {
  return withTenantSchema(schemaName, async (client) => {
    // Get sources with basic info
    const sourcesResult = await client.query(
      `SELECT s.id, s.title, s.description, s.file_name, s.file_type, s.status, s.duration,
              s.processing_step, s.processing_progress, s.processing_started_at,
              s.thumbnail_url, s.language, s.detected_language, s.created_at, s.updated_at
       FROM sources s
       WHERE s.project_id = $1 AND s.deleted_at IS NULL
       ORDER BY s.created_at DESC`,
      [projectId]
    );

    // Get tag aggregations for all sources in one query
    const tagsResult = await client.query(
      `SELECT ts.source_id, t.id as tag_id, t.name as tag_name, t.color as tag_color, COUNT(*) as highlight_count
       FROM highlights h
       JOIN tags t ON t.id = h.tag_id
       JOIN transcript_segments ts ON ts.id = h.segment_id
       JOIN sources s ON s.id = ts.source_id
       WHERE s.project_id = $1 AND s.deleted_at IS NULL
       GROUP BY ts.source_id, t.id, t.name, t.color`,
      [projectId]
    );

    // Get highlight counts per source
    const highlightCountsResult = await client.query(
      `SELECT ts.source_id, COUNT(*) as count
       FROM highlights h
       JOIN transcript_segments ts ON ts.id = h.segment_id
       JOIN sources s ON s.id = ts.source_id
       WHERE s.project_id = $1 AND s.deleted_at IS NULL
       GROUP BY ts.source_id`,
      [projectId]
    );

    // Get segment counts per source
    const segmentCountsResult = await client.query(
      `SELECT source_id, COUNT(*) as count
       FROM transcript_segments ts
       JOIN sources s ON s.id = ts.source_id
       WHERE s.project_id = $1 AND s.deleted_at IS NULL
       GROUP BY source_id`,
      [projectId]
    );

    // Get trashed count
    const trashedResult = await client.query(
      `SELECT COUNT(*) FROM sources WHERE project_id = $1 AND deleted_at IS NOT NULL`,
      [projectId]
    );

    // Build tag map: sourceId -> tags[]
    const tagsBySource = new Map<string, Array<{ id: string; name: string; color: string }>>();
    for (const row of tagsResult.rows) {
      const sourceId = row.source_id;
      if (!tagsBySource.has(sourceId)) {
        tagsBySource.set(sourceId, []);
      }
      tagsBySource.get(sourceId)!.push({
        id: row.tag_id,
        name: row.tag_name,
        color: row.tag_color,
      });
    }

    // Build highlight count map
    const highlightCountBySource = new Map<string, number>();
    for (const row of highlightCountsResult.rows) {
      highlightCountBySource.set(row.source_id, parseInt(row.count, 10));
    }

    // Build segment count map
    const segmentCountBySource = new Map<string, number>();
    for (const row of segmentCountsResult.rows) {
      segmentCountBySource.set(row.source_id, parseInt(row.count, 10));
    }

    // Transform sources
    const sources: SourceWithTags[] = sourcesResult.rows.map((row) => ({
      id: row.id,
      projectId,
      title: row.title,
      description: row.description || null,
      fileName: row.file_name,
      fileUrl: '', // Not needed for list
      fileType: row.file_type,
      status: row.status,
      duration: row.duration,
      language: row.language || 'auto',
      detectedLanguage: row.detected_language,
      processingStep: row.processing_step,
      processingProgress: row.processing_progress || 0,
      processingStartedAt: row.processing_started_at,
      deletedAt: null,
      thumbnailUrl: row.thumbnail_url,
      summary: null,
      summaryStatus: 'PENDING',
      summaryGeneratedAt: null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      tags: tagsBySource.get(row.id) || [],
      highlightCount: highlightCountBySource.get(row.id) || 0,
      segmentsCount: segmentCountBySource.get(row.id) || 0,
    }));

    return {
      sources,
      trashedCount: parseInt(trashedResult.rows[0].count, 10),
    };
  });
}

export async function getSourceById(
  schemaName: string,
  sourceId: string
): Promise<TenantSource | null> {
  return withTenantSchema(schemaName, async (client) => {
    const result = await client.query(
      `SELECT s.*,
              (SELECT COUNT(*) FROM transcript_segments ts WHERE ts.source_id = s.id) as segment_count
       FROM sources s
       WHERE s.id = $1`,
      [sourceId]
    );
    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    const source = toCamelCase(row) as TenantSource & { segmentCount: string };
    return {
      ...source,
      _count: { segments: parseInt(source.segmentCount, 10) },
    };
  });
}

/**
 * Get source with its project data (for language configuration)
 */
export async function getSourceWithProject(
  schemaName: string,
  sourceId: string
): Promise<(TenantSource & { project: { id: string; language: string } }) | null> {
  return withTenantSchema(schemaName, async (client) => {
    const result = await client.query(
      `SELECT s.*, p.id as project_id, p.language as project_language
       FROM sources s
       JOIN projects p ON p.id = s.project_id
       WHERE s.id = $1`,
      [sourceId]
    );
    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    const source = toCamelCase(row) as TenantSource & {
      projectLanguage: string;
    };
    return {
      ...source,
      project: {
        id: source.projectId,
        language: source.projectLanguage || 'en',
      },
    };
  });
}

export async function createSource(
  schemaName: string,
  data: {
    projectId: string;
    title: string;
    fileName: string;
    fileUrl: string;
    fileType: string;
    status?: string;
    language?: string;
  }
): Promise<TenantSource> {
  return withTenantSchema(schemaName, async (client) => {
    const result = await client.query(
      `INSERT INTO sources (project_id, title, file_name, file_url, file_type, status, language)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        data.projectId,
        data.title,
        data.fileName,
        data.fileUrl,
        data.fileType,
        data.status || 'PENDING',
        data.language || 'auto',
      ]
    );
    const source = toCamelCase(result.rows[0]) as TenantSource;
    return { ...source, _count: { segments: 0 } };
  });
}

export async function updateSource(
  schemaName: string,
  sourceId: string,
  data: Partial<{
    title: string;
    description: string | null;
    fileUrl: string;
    status: string;
    duration: number | null;
    language: string;
    detectedLanguage: string | null;
    processingStep: string | null;
    processingProgress: number;
    processingStartedAt: Date | null;
    deletedAt: Date | null;
    thumbnailUrl: string | null;
    summary: Record<string, unknown> | null;
    summaryStatus: string;
    summaryGeneratedAt: Date | null;
  }>
): Promise<TenantSource | null> {
  return withTenantSchema(schemaName, async (client) => {
    const setClauses: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    const fieldMap: Record<string, string> = {
      title: 'title',
      description: 'description',
      fileUrl: 'file_url',
      status: 'status',
      duration: 'duration',
      language: 'language',
      detectedLanguage: 'detected_language',
      processingStep: 'processing_step',
      processingProgress: 'processing_progress',
      processingStartedAt: 'processing_started_at',
      deletedAt: 'deleted_at',
      thumbnailUrl: 'thumbnail_url',
      summary: 'summary',
      summaryStatus: 'summary_status',
      summaryGeneratedAt: 'summary_generated_at',
    };

    for (const [key, column] of Object.entries(fieldMap)) {
      if (data[key as keyof typeof data] !== undefined) {
        setClauses.push(`${column} = $${paramIndex++}`);
        const value = data[key as keyof typeof data];
        values.push(key === 'summary' && value ? JSON.stringify(value) : value);
      }
    }

    if (setClauses.length === 0) return null;

    values.push(sourceId);
    const result = await client.query(
      `UPDATE sources SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    if (result.rows.length === 0) return null;
    return toCamelCase(result.rows[0]) as TenantSource;
  });
}

export async function deleteSource(
  schemaName: string,
  sourceId: string,
  soft: boolean = true
): Promise<boolean> {
  return withTenantSchema(schemaName, async (client) => {
    if (soft) {
      const result = await client.query(
        `UPDATE sources SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL`,
        [sourceId]
      );
      return result.rowCount !== null && result.rowCount > 0;
    } else {
      const result = await client.query(`DELETE FROM sources WHERE id = $1`, [sourceId]);
      return result.rowCount !== null && result.rowCount > 0;
    }
  });
}

export async function restoreSource(schemaName: string, sourceId: string): Promise<boolean> {
  return withTenantSchema(schemaName, async (client) => {
    const result = await client.query(
      `UPDATE sources SET deleted_at = NULL WHERE id = $1 AND deleted_at IS NOT NULL`,
      [sourceId]
    );
    return result.rowCount !== null && result.rowCount > 0;
  });
}

/**
 * Empty trash - permanently delete all trashed sources for a project.
 * Returns the number of deleted sources.
 */
export async function emptyTrash(schemaName: string, projectId: string): Promise<number> {
  return withTenantSchema(schemaName, async (client) => {
    const result = await client.query(
      `DELETE FROM sources WHERE project_id = $1 AND deleted_at IS NOT NULL`,
      [projectId]
    );
    return result.rowCount ?? 0;
  });
}
