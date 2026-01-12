import { PoolClient } from 'pg';
import { withTenantSchema } from './tenant';

/**
 * Default tenant schema for self-hosted mode.
 * In cloud SaaS, this would be dynamically determined from share link routing.
 */
export const DEFAULT_TENANT_SCHEMA = 'tenant_default';

/**
 * Tenant Query Helpers
 *
 * Type-safe wrappers for raw SQL queries on tenant schemas.
 * All functions accept schemaName and use withTenantSchema internally.
 */

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface TenantProject {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  summary: Record<string, unknown> | null;
  summaryStatus: string;
  summaryGeneratedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  _count?: {
    sources: number;
  };
}

export interface TenantSource {
  id: string;
  projectId: string;
  title: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  duration: number | null;
  status: string;
  processingStep: string | null;
  processingProgress: number;
  processingStartedAt: Date | null;
  deletedAt: Date | null;
  summary: Record<string, unknown> | null;
  summaryStatus: string;
  summaryGeneratedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  _count?: {
    segments: number;
  };
}

export interface TenantSegment {
  id: string;
  sourceId: string;
  content: string;
  startTime: number;
  endTime: number;
  speakerId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TenantTag {
  id: string;
  projectId: string;
  name: string;
  color: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  _count?: {
    highlights: number;
  };
}

export interface TenantTheme {
  id: string;
  projectId: string;
  name: string;
  description: string | null;
  color: string;
  createdAt: Date;
  updatedAt: Date;
  _count?: {
    highlights: number;
  };
}

export interface TenantHighlight {
  id: string;
  segmentId: string;
  tagId: string;
  note: string | null;
  selectedText: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TenantWorkspace {
  id: string;
  name: string;
  slug: string;
  aiProvider: string | null;
  openaiTranscriptionModel: string | null;
  embeddingProvider: string | null;
  geminiApiKey: string | null;
  openaiApiKey: string | null;
  ollamaBaseUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TenantShareLink {
  id: string;
  token: string;
  projectId: string;
  sourceId: string | null;
  shareType: string;
  includeEvidence: boolean;
  includeInsights: boolean;
  createdById: string;
  isActive: boolean;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TenantSpeakerName {
  id: string;
  projectId: string;
  speakerId: string;
  customName: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// UTILITY: SNAKE_CASE TO CAMELCASE CONVERSION
// ============================================

type SnakeToCamel<S extends string> = S extends `${infer T}_${infer U}`
  ? `${T}${Capitalize<SnakeToCamel<U>>}`
  : S;

type CamelCaseObject<T> = {
  [K in keyof T as K extends string ? SnakeToCamel<K> : K]: T[K];
};

/**
 * Convert snake_case object keys to camelCase.
 * Used to transform SQL results to JS-friendly format.
 */
export function toCamelCase<T extends Record<string, unknown>>(obj: T): CamelCaseObject<T> {
  const result: Record<string, unknown> = {};
  for (const key in obj) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
    result[camelKey] = obj[key];
  }
  return result as CamelCaseObject<T>;
}

/**
 * Convert array of snake_case objects to camelCase.
 */
export function rowsToCamelCase<T extends Record<string, unknown>>(
  rows: T[]
): CamelCaseObject<T>[] {
  return rows.map(toCamelCase);
}

// ============================================
// WORKSPACE QUERIES
// ============================================

export async function getWorkspaceById(
  schemaName: string,
  workspaceId: string
): Promise<TenantWorkspace | null> {
  return withTenantSchema(schemaName, async (client) => {
    const result = await client.query(`SELECT * FROM workspaces WHERE id = $1`, [workspaceId]);
    if (result.rows.length === 0) return null;
    return toCamelCase(result.rows[0]) as TenantWorkspace;
  });
}

export async function getWorkspaceByUserId(
  schemaName: string,
  userId: string
): Promise<TenantWorkspace | null> {
  return withTenantSchema(schemaName, async (client) => {
    const result = await client.query(
      `SELECT w.* FROM workspaces w
       JOIN workspace_members wm ON wm.workspace_id = w.id
       WHERE wm.user_id = $1
       LIMIT 1`,
      [userId]
    );
    if (result.rows.length === 0) return null;
    return toCamelCase(result.rows[0]) as TenantWorkspace;
  });
}

// ============================================
// PROJECT QUERIES
// ============================================

export async function listProjects(
  schemaName: string,
  workspaceId: string
): Promise<TenantProject[]> {
  return withTenantSchema(schemaName, async (client) => {
    const result = await client.query(
      `SELECT p.*,
              (SELECT COUNT(*) FROM sources s WHERE s.project_id = p.id AND s.deleted_at IS NULL) as source_count
       FROM projects p
       WHERE p.workspace_id = $1
       ORDER BY p.updated_at DESC`,
      [workspaceId]
    );
    return result.rows.map((row) => {
      const project = toCamelCase(row) as TenantProject & { sourceCount: string };
      return {
        ...project,
        _count: { sources: parseInt(project.sourceCount, 10) },
      };
    });
  });
}

export async function getProjectById(
  schemaName: string,
  projectId: string
): Promise<TenantProject | null> {
  return withTenantSchema(schemaName, async (client) => {
    const result = await client.query(
      `SELECT p.*,
              (SELECT COUNT(*) FROM sources s WHERE s.project_id = p.id AND s.deleted_at IS NULL) as source_count
       FROM projects p
       WHERE p.id = $1`,
      [projectId]
    );
    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    const project = toCamelCase(row) as TenantProject & { sourceCount: string };
    return {
      ...project,
      _count: { sources: parseInt(project.sourceCount, 10) },
    };
  });
}

export async function createProject(
  schemaName: string,
  data: { workspaceId: string; name: string; description?: string | null }
): Promise<TenantProject> {
  return withTenantSchema(schemaName, async (client) => {
    const result = await client.query(
      `INSERT INTO projects (workspace_id, name, description)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [data.workspaceId, data.name, data.description || null]
    );
    const project = toCamelCase(result.rows[0]) as TenantProject;
    return { ...project, _count: { sources: 0 } };
  });
}

export async function updateProject(
  schemaName: string,
  projectId: string,
  data: Partial<{
    name: string;
    description: string | null;
    summary: Record<string, unknown> | null;
    summaryStatus: string;
    summaryGeneratedAt: Date | null;
  }>
): Promise<TenantProject | null> {
  return withTenantSchema(schemaName, async (client) => {
    const setClauses: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      setClauses.push(`name = $${paramIndex++}`);
      values.push(data.name);
    }
    if (data.description !== undefined) {
      setClauses.push(`description = $${paramIndex++}`);
      values.push(data.description);
    }
    if (data.summary !== undefined) {
      setClauses.push(`summary = $${paramIndex++}`);
      values.push(JSON.stringify(data.summary));
    }
    if (data.summaryStatus !== undefined) {
      setClauses.push(`summary_status = $${paramIndex++}`);
      values.push(data.summaryStatus);
    }
    if (data.summaryGeneratedAt !== undefined) {
      setClauses.push(`summary_generated_at = $${paramIndex++}`);
      values.push(data.summaryGeneratedAt);
    }

    if (setClauses.length === 0) return null;

    values.push(projectId);
    const result = await client.query(
      `UPDATE projects SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    if (result.rows.length === 0) return null;
    return toCamelCase(result.rows[0]) as TenantProject;
  });
}

export async function deleteProject(schemaName: string, projectId: string): Promise<boolean> {
  return withTenantSchema(schemaName, async (client) => {
    const result = await client.query(`DELETE FROM projects WHERE id = $1`, [projectId]);
    return result.rowCount !== null && result.rowCount > 0;
  });
}

// ============================================
// SOURCE QUERIES
// ============================================

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

export interface SourceWithTags extends TenantSource {
  tags: Array<{ id: string; name: string; color: string }>;
  highlightCount: number;
  segmentsCount: number;
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
      `SELECT s.id, s.title, s.file_name, s.file_type, s.status, s.duration,
              s.processing_step, s.processing_progress, s.processing_started_at,
              s.created_at, s.updated_at
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
      fileName: row.file_name,
      fileUrl: '', // Not needed for list
      fileType: row.file_type,
      status: row.status,
      duration: row.duration,
      processingStep: row.processing_step,
      processingProgress: row.processing_progress || 0,
      processingStartedAt: row.processing_started_at,
      deletedAt: null,
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

export async function createSource(
  schemaName: string,
  data: {
    projectId: string;
    title: string;
    fileName: string;
    fileUrl: string;
    fileType: string;
    status?: string;
  }
): Promise<TenantSource> {
  return withTenantSchema(schemaName, async (client) => {
    const result = await client.query(
      `INSERT INTO sources (project_id, title, file_name, file_url, file_type, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        data.projectId,
        data.title,
        data.fileName,
        data.fileUrl,
        data.fileType,
        data.status || 'PENDING',
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
    fileUrl: string;
    status: string;
    duration: number | null;
    processingStep: string | null;
    processingProgress: number;
    processingStartedAt: Date | null;
    deletedAt: Date | null;
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
      fileUrl: 'file_url',
      status: 'status',
      duration: 'duration',
      processingStep: 'processing_step',
      processingProgress: 'processing_progress',
      processingStartedAt: 'processing_started_at',
      deletedAt: 'deleted_at',
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

// ============================================
// TAG QUERIES
// ============================================

export async function listTags(schemaName: string, projectId: string): Promise<TenantTag[]> {
  return withTenantSchema(schemaName, async (client) => {
    const result = await client.query(
      `SELECT t.*,
              (SELECT COUNT(*) FROM highlights h WHERE h.tag_id = t.id) as highlight_count
       FROM tags t
       WHERE t.project_id = $1
       ORDER BY t.name ASC`,
      [projectId]
    );
    return result.rows.map((row) => {
      const tag = toCamelCase(row) as TenantTag & { highlightCount: string };
      return {
        ...tag,
        _count: { highlights: parseInt(tag.highlightCount, 10) },
      };
    });
  });
}

export async function getTagById(schemaName: string, tagId: string): Promise<TenantTag | null> {
  return withTenantSchema(schemaName, async (client) => {
    const result = await client.query(
      `SELECT t.*,
              (SELECT COUNT(*) FROM highlights h WHERE h.tag_id = t.id) as highlight_count
       FROM tags t
       WHERE t.id = $1`,
      [tagId]
    );
    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    const tag = toCamelCase(row) as TenantTag & { highlightCount: string };
    return {
      ...tag,
      _count: { highlights: parseInt(tag.highlightCount, 10) },
    };
  });
}

export async function getTagByName(
  schemaName: string,
  projectId: string,
  name: string
): Promise<TenantTag | null> {
  return withTenantSchema(schemaName, async (client) => {
    const result = await client.query(`SELECT * FROM tags WHERE project_id = $1 AND name = $2`, [
      projectId,
      name,
    ]);
    if (result.rows.length === 0) return null;
    return toCamelCase(result.rows[0]) as TenantTag;
  });
}

export async function createTag(
  schemaName: string,
  data: {
    projectId: string;
    name: string;
    color?: string;
    description?: string | null;
  }
): Promise<TenantTag> {
  return withTenantSchema(schemaName, async (client) => {
    const result = await client.query(
      `INSERT INTO tags (project_id, name, color, description)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [data.projectId, data.name, data.color || '#3B82F6', data.description || null]
    );
    const tag = toCamelCase(result.rows[0]) as TenantTag;
    return { ...tag, _count: { highlights: 0 } };
  });
}

export async function updateTag(
  schemaName: string,
  tagId: string,
  data: Partial<{ name: string; color: string; description: string | null }>
): Promise<TenantTag | null> {
  return withTenantSchema(schemaName, async (client) => {
    const setClauses: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      setClauses.push(`name = $${paramIndex++}`);
      values.push(data.name);
    }
    if (data.color !== undefined) {
      setClauses.push(`color = $${paramIndex++}`);
      values.push(data.color);
    }
    if (data.description !== undefined) {
      setClauses.push(`description = $${paramIndex++}`);
      values.push(data.description);
    }

    if (setClauses.length === 0) return null;

    values.push(tagId);
    const result = await client.query(
      `UPDATE tags SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    if (result.rows.length === 0) return null;
    return toCamelCase(result.rows[0]) as TenantTag;
  });
}

export async function deleteTag(schemaName: string, tagId: string): Promise<boolean> {
  return withTenantSchema(schemaName, async (client) => {
    const result = await client.query(`DELETE FROM tags WHERE id = $1`, [tagId]);
    return result.rowCount !== null && result.rowCount > 0;
  });
}

// ============================================
// THEME QUERIES
// ============================================

export async function listThemes(schemaName: string, projectId: string): Promise<TenantTheme[]> {
  return withTenantSchema(schemaName, async (client) => {
    const result = await client.query(
      `SELECT t.*,
              (SELECT COUNT(*) FROM highlight_themes ht WHERE ht.theme_id = t.id) as highlight_count
       FROM themes t
       WHERE t.project_id = $1
       ORDER BY t.name ASC`,
      [projectId]
    );
    return result.rows.map((row) => {
      const theme = toCamelCase(row) as TenantTheme & { highlightCount: string };
      return {
        ...theme,
        _count: { highlights: parseInt(theme.highlightCount, 10) },
      };
    });
  });
}

export async function getThemeById(
  schemaName: string,
  themeId: string
): Promise<TenantTheme | null> {
  return withTenantSchema(schemaName, async (client) => {
    const result = await client.query(
      `SELECT t.*,
              (SELECT COUNT(*) FROM highlight_themes ht WHERE ht.theme_id = t.id) as highlight_count
       FROM themes t
       WHERE t.id = $1`,
      [themeId]
    );
    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    const theme = toCamelCase(row) as TenantTheme & { highlightCount: string };
    return {
      ...theme,
      _count: { highlights: parseInt(theme.highlightCount, 10) },
    };
  });
}

export async function createTheme(
  schemaName: string,
  data: {
    projectId: string;
    name: string;
    description?: string | null;
    color?: string;
  }
): Promise<TenantTheme> {
  return withTenantSchema(schemaName, async (client) => {
    const result = await client.query(
      `INSERT INTO themes (project_id, name, description, color)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [data.projectId, data.name, data.description || null, data.color || '#6366F1']
    );
    const theme = toCamelCase(result.rows[0]) as TenantTheme;
    return { ...theme, _count: { highlights: 0 } };
  });
}

export async function updateTheme(
  schemaName: string,
  themeId: string,
  data: Partial<{ name: string; description: string | null; color: string }>
): Promise<TenantTheme | null> {
  return withTenantSchema(schemaName, async (client) => {
    const setClauses: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      setClauses.push(`name = $${paramIndex++}`);
      values.push(data.name);
    }
    if (data.description !== undefined) {
      setClauses.push(`description = $${paramIndex++}`);
      values.push(data.description);
    }
    if (data.color !== undefined) {
      setClauses.push(`color = $${paramIndex++}`);
      values.push(data.color);
    }

    if (setClauses.length === 0) return null;

    values.push(themeId);
    const result = await client.query(
      `UPDATE themes SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    if (result.rows.length === 0) return null;
    return toCamelCase(result.rows[0]) as TenantTheme;
  });
}

export async function deleteTheme(schemaName: string, themeId: string): Promise<boolean> {
  return withTenantSchema(schemaName, async (client) => {
    const result = await client.query(`DELETE FROM themes WHERE id = $1`, [themeId]);
    return result.rowCount !== null && result.rowCount > 0;
  });
}

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

// ============================================
// SPEAKER NAME QUERIES
// ============================================

export async function listSpeakerNames(
  schemaName: string,
  projectId: string
): Promise<TenantSpeakerName[]> {
  return withTenantSchema(schemaName, async (client) => {
    const result = await client.query(`SELECT * FROM speaker_names WHERE project_id = $1`, [
      projectId,
    ]);
    return rowsToCamelCase(result.rows) as TenantSpeakerName[];
  });
}

export async function upsertSpeakerName(
  schemaName: string,
  data: { projectId: string; speakerId: string; customName: string }
): Promise<TenantSpeakerName> {
  return withTenantSchema(schemaName, async (client) => {
    const result = await client.query(
      `INSERT INTO speaker_names (project_id, speaker_id, custom_name)
       VALUES ($1, $2, $3)
       ON CONFLICT (project_id, speaker_id) DO UPDATE SET custom_name = EXCLUDED.custom_name
       RETURNING *`,
      [data.projectId, data.speakerId, data.customName]
    );
    return toCamelCase(result.rows[0]) as TenantSpeakerName;
  });
}

export async function deleteSpeakerName(
  schemaName: string,
  projectId: string,
  speakerId: string
): Promise<boolean> {
  return withTenantSchema(schemaName, async (client) => {
    const result = await client.query(
      `DELETE FROM speaker_names WHERE project_id = $1 AND speaker_id = $2`,
      [projectId, speakerId]
    );
    return result.rowCount !== null && result.rowCount > 0;
  });
}

// ============================================
// ACCESS VERIFICATION QUERIES
// ============================================

/**
 * Verify project belongs to workspace in tenant schema.
 */
export async function verifyProjectAccessTenant(
  schemaName: string,
  projectId: string,
  workspaceId: string
): Promise<TenantProject | null> {
  return withTenantSchema(schemaName, async (client) => {
    const result = await client.query(
      `SELECT * FROM projects WHERE id = $1 AND workspace_id = $2`,
      [projectId, workspaceId]
    );
    if (result.rows.length === 0) return null;
    return toCamelCase(result.rows[0]) as TenantProject;
  });
}

/**
 * Verify source belongs to workspace via project in tenant schema.
 */
export async function verifySourceAccessTenant(
  schemaName: string,
  sourceId: string,
  workspaceId: string
): Promise<TenantSource | null> {
  return withTenantSchema(schemaName, async (client) => {
    const result = await client.query(
      `SELECT s.* FROM sources s
       JOIN projects p ON p.id = s.project_id
       WHERE s.id = $1 AND p.workspace_id = $2`,
      [sourceId, workspaceId]
    );
    if (result.rows.length === 0) return null;
    return toCamelCase(result.rows[0]) as TenantSource;
  });
}

/**
 * Verify segment belongs to workspace in tenant schema.
 */
export async function verifySegmentAccessTenant(
  schemaName: string,
  segmentId: string,
  workspaceId: string
): Promise<TenantSegment | null> {
  return withTenantSchema(schemaName, async (client) => {
    const result = await client.query(
      `SELECT ts.* FROM transcript_segments ts
       JOIN sources s ON s.id = ts.source_id
       JOIN projects p ON p.id = s.project_id
       WHERE ts.id = $1 AND p.workspace_id = $2`,
      [segmentId, workspaceId]
    );
    if (result.rows.length === 0) return null;
    return toCamelCase(result.rows[0]) as TenantSegment;
  });
}

/**
 * Verify tag belongs to workspace in tenant schema.
 */
export async function verifyTagAccessTenant(
  schemaName: string,
  tagId: string,
  workspaceId: string
): Promise<TenantTag | null> {
  return withTenantSchema(schemaName, async (client) => {
    const result = await client.query(
      `SELECT t.* FROM tags t
       JOIN projects p ON p.id = t.project_id
       WHERE t.id = $1 AND p.workspace_id = $2`,
      [tagId, workspaceId]
    );
    if (result.rows.length === 0) return null;
    return toCamelCase(result.rows[0]) as TenantTag;
  });
}

/**
 * Verify theme belongs to project in tenant schema.
 */
export async function verifyThemeAccessTenant(
  schemaName: string,
  themeId: string,
  projectId: string
): Promise<TenantTheme | null> {
  return withTenantSchema(schemaName, async (client) => {
    const result = await client.query(`SELECT * FROM themes WHERE id = $1 AND project_id = $2`, [
      themeId,
      projectId,
    ]);
    if (result.rows.length === 0) return null;
    return toCamelCase(result.rows[0]) as TenantTheme;
  });
}

/**
 * Verify highlight belongs to workspace in tenant schema.
 */
export async function verifyHighlightAccessTenant(
  schemaName: string,
  highlightId: string,
  workspaceId: string
): Promise<TenantHighlight | null> {
  return withTenantSchema(schemaName, async (client) => {
    const result = await client.query(
      `SELECT h.* FROM highlights h
       JOIN transcript_segments ts ON ts.id = h.segment_id
       JOIN sources s ON s.id = ts.source_id
       JOIN projects p ON p.id = s.project_id
       WHERE h.id = $1 AND p.workspace_id = $2`,
      [highlightId, workspaceId]
    );
    if (result.rows.length === 0) return null;
    return toCamelCase(result.rows[0]) as TenantHighlight;
  });
}

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

// ============================================
// SOURCE WITH FULL DETAILS (for Analysis Canvas)
// ============================================

export interface SourceWithDetails extends TenantSource {
  segments: Array<
    TenantSegment & {
      highlights: Array<TenantHighlight & { tag: TenantTag }>;
    }
  >;
  project: TenantProject & {
    tags: TenantTag[];
    workspace: { id: string; name: string; slug: string };
  };
}

/**
 * Get source with full details: segments (with highlights and tags),
 * project (with tags and workspace). Used by Analysis Canvas.
 */
export async function getSourceWithDetails(
  schemaName: string,
  sourceId: string
): Promise<SourceWithDetails | null> {
  return withTenantSchema(schemaName, async (client) => {
    // Get source
    const sourceResult = await client.query(`SELECT * FROM sources WHERE id = $1`, [sourceId]);
    if (sourceResult.rows.length === 0) return null;
    const sourceRow = sourceResult.rows[0];

    // Get project with workspace
    const projectResult = await client.query(
      `SELECT p.*, w.id as workspace_id, w.name as workspace_name, w.slug as workspace_slug
       FROM projects p
       JOIN workspaces w ON w.id = p.workspace_id
       WHERE p.id = $1`,
      [sourceRow.project_id]
    );
    if (projectResult.rows.length === 0) return null;
    const projectRow = projectResult.rows[0];

    // Get project tags
    const tagsResult = await client.query(
      `SELECT * FROM tags WHERE project_id = $1 ORDER BY name ASC`,
      [sourceRow.project_id]
    );

    // Get segments
    const segmentsResult = await client.query(
      `SELECT id, source_id, content, start_time, end_time, speaker_id, created_at, updated_at
       FROM transcript_segments
       WHERE source_id = $1
       ORDER BY start_time ASC`,
      [sourceId]
    );

    // Get all segment IDs
    const segmentIds = segmentsResult.rows.map((r) => r.id);

    // Get highlights for all segments with tags (single query for efficiency)
    const highlightsMap = new Map<string, Array<TenantHighlight & { tag: TenantTag }>>();

    if (segmentIds.length > 0) {
      const highlightsResult = await client.query(
        `SELECT h.*, t.id as tag_id, t.project_id as tag_project_id, t.name as tag_name,
                t.color as tag_color, t.description as tag_description,
                t.created_at as tag_created_at, t.updated_at as tag_updated_at
         FROM highlights h
         JOIN tags t ON t.id = h.tag_id
         WHERE h.segment_id = ANY($1)`,
        [segmentIds]
      );

      for (const row of highlightsResult.rows) {
        const segmentId = row.segment_id;
        if (!highlightsMap.has(segmentId)) {
          highlightsMap.set(segmentId, []);
        }
        highlightsMap.get(segmentId)!.push({
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
        });
      }
    }

    // Build segments with highlights
    const segments = segmentsResult.rows.map((row) => ({
      id: row.id,
      sourceId: row.source_id,
      content: row.content,
      startTime: row.start_time,
      endTime: row.end_time,
      speakerId: row.speaker_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      highlights: highlightsMap.get(row.id) || [],
    }));

    // Build project with tags and workspace
    const project: TenantProject & {
      tags: TenantTag[];
      workspace: { id: string; name: string; slug: string };
    } = {
      id: projectRow.id,
      workspaceId: projectRow.workspace_id,
      name: projectRow.name,
      description: projectRow.description,
      summary: projectRow.summary,
      summaryStatus: projectRow.summary_status,
      summaryGeneratedAt: projectRow.summary_generated_at,
      createdAt: projectRow.created_at,
      updatedAt: projectRow.updated_at,
      tags: tagsResult.rows.map((t) => ({
        id: t.id,
        projectId: t.project_id,
        name: t.name,
        color: t.color,
        description: t.description,
        createdAt: t.created_at,
        updatedAt: t.updated_at,
      })),
      workspace: {
        id: projectRow.workspace_id,
        name: projectRow.workspace_name,
        slug: projectRow.workspace_slug,
      },
    };

    // Build source
    const source: SourceWithDetails = {
      id: sourceRow.id,
      projectId: sourceRow.project_id,
      title: sourceRow.title,
      fileName: sourceRow.file_name,
      fileUrl: sourceRow.file_url,
      fileType: sourceRow.file_type,
      duration: sourceRow.duration,
      status: sourceRow.status,
      processingStep: sourceRow.processing_step,
      processingProgress: sourceRow.processing_progress || 0,
      processingStartedAt: sourceRow.processing_started_at,
      deletedAt: sourceRow.deleted_at,
      summary: sourceRow.summary,
      summaryStatus: sourceRow.summary_status,
      summaryGeneratedAt: sourceRow.summary_generated_at,
      createdAt: sourceRow.created_at,
      updatedAt: sourceRow.updated_at,
      segments,
      project,
    };

    return source;
  });
}

// ============================================
// DASHBOARD QUERIES
// ============================================

export interface DashboardStats {
  totalProjects: number;
  totalSources: number;
  totalHighlights: number;
  activeThemes: number;
}

export interface DashboardProject {
  id: string;
  name: string;
  description: string | null;
  updatedAt: Date;
  thumbnailUrl: string | null;
  _count: {
    sources: number;
    highlights: number;
  };
}

export interface DashboardActivity {
  id: string;
  type: 'source_created' | 'highlight_created';
  description: string;
  createdAt: Date;
}

/**
 * Get dashboard statistics for a workspace.
 */
export async function getDashboardStats(
  schemaName: string,
  workspaceId: string
): Promise<DashboardStats> {
  return withTenantSchema(schemaName, async (client) => {
    const result = await client.query(
      `SELECT
         (SELECT COUNT(*) FROM projects WHERE workspace_id = $1) as total_projects,
         (SELECT COUNT(*) FROM sources s JOIN projects p ON p.id = s.project_id WHERE p.workspace_id = $1 AND s.deleted_at IS NULL) as total_sources,
         (SELECT COUNT(*) FROM highlights h JOIN transcript_segments ts ON ts.id = h.segment_id JOIN sources s ON s.id = ts.source_id JOIN projects p ON p.id = s.project_id WHERE p.workspace_id = $1 AND s.deleted_at IS NULL) as total_highlights,
         (SELECT COUNT(*) FROM themes t JOIN projects p ON p.id = t.project_id WHERE p.workspace_id = $1) as active_themes`,
      [workspaceId]
    );
    const row = result.rows[0];
    return {
      totalProjects: parseInt(row.total_projects, 10),
      totalSources: parseInt(row.total_sources, 10),
      totalHighlights: parseInt(row.total_highlights, 10),
      activeThemes: parseInt(row.active_themes, 10),
    };
  });
}

/**
 * Get recent projects for dashboard.
 */
export async function listRecentProjects(
  schemaName: string,
  workspaceId: string,
  limit: number = 6
): Promise<DashboardProject[]> {
  return withTenantSchema(schemaName, async (client) => {
    const result = await client.query(
      `SELECT p.id, p.name, p.description, p.updated_at,
              (SELECT COUNT(*) FROM sources s WHERE s.project_id = p.id AND s.deleted_at IS NULL) as source_count,
              (SELECT COUNT(*) FROM highlights h JOIN transcript_segments ts ON ts.id = h.segment_id JOIN sources s ON s.id = ts.source_id WHERE s.project_id = p.id AND s.deleted_at IS NULL) as highlight_count
       FROM projects p
       WHERE p.workspace_id = $1
       ORDER BY p.updated_at DESC
       LIMIT $2`,
      [workspaceId, limit]
    );
    return result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      updatedAt: row.updated_at,
      thumbnailUrl: null,
      _count: {
        sources: parseInt(row.source_count, 10),
        highlights: parseInt(row.highlight_count, 10),
      },
    }));
  });
}

/**
 * Get recent activity for dashboard.
 */
export async function listRecentActivity(
  schemaName: string,
  workspaceId: string,
  limit: number = 5
): Promise<DashboardActivity[]> {
  return withTenantSchema(schemaName, async (client) => {
    // Get recent sources
    const sourcesResult = await client.query(
      `SELECT s.id, s.title, s.created_at, p.name as project_name
       FROM sources s
       JOIN projects p ON p.id = s.project_id
       WHERE p.workspace_id = $1 AND s.deleted_at IS NULL
       ORDER BY s.created_at DESC
       LIMIT 3`,
      [workspaceId]
    );

    // Get recent highlights
    const highlightsResult = await client.query(
      `SELECT h.id, h.created_at, ts.content, p.name as project_name
       FROM highlights h
       JOIN transcript_segments ts ON ts.id = h.segment_id
       JOIN sources s ON s.id = ts.source_id
       JOIN projects p ON p.id = s.project_id
       WHERE p.workspace_id = $1 AND s.deleted_at IS NULL
       ORDER BY h.created_at DESC
       LIMIT 3`,
      [workspaceId]
    );

    // Combine and sort
    const activities: DashboardActivity[] = [
      ...sourcesResult.rows.map((s) => ({
        id: s.id,
        type: 'source_created' as const,
        description: `Source "${s.title}" added to ${s.project_name}`,
        createdAt: s.created_at,
      })),
      ...highlightsResult.rows.map((h) => ({
        id: h.id,
        type: 'highlight_created' as const,
        description: `Highlight created in ${h.project_name}: "${h.content.slice(0, 50)}${h.content.length > 50 ? '...' : ''}"`,
        createdAt: h.created_at,
      })),
    ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return activities.slice(0, limit);
  });
}

// ============================================
// EVIDENCE PAGE QUERIES
// ============================================

export interface EvidencePageData {
  id: string;
  name: string;
  description: string | null;
  updatedAt: Date;
  workspace: {
    id: string;
    name: string;
    slug: string;
  };
  sources: Array<{ id: string; title: string }>;
  tags: Array<{ id: string; name: string; color: string }>;
  sourcesCount: number;
  highlightsCount: number;
}

/**
 * Get project data for evidence page.
 */
export async function getProjectForEvidencePage(
  schemaName: string,
  projectId: string
): Promise<EvidencePageData | null> {
  return withTenantSchema(schemaName, async (client) => {
    // Get project with workspace
    const projectResult = await client.query(
      `SELECT p.*, w.id as workspace_id, w.name as workspace_name, w.slug as workspace_slug
       FROM projects p
       JOIN workspaces w ON w.id = p.workspace_id
       WHERE p.id = $1`,
      [projectId]
    );
    if (projectResult.rows.length === 0) return null;
    const p = projectResult.rows[0];

    // Get sources
    const sourcesResult = await client.query(
      `SELECT id, title FROM sources
       WHERE project_id = $1 AND deleted_at IS NULL
       ORDER BY title ASC`,
      [projectId]
    );

    // Get tags
    const tagsResult = await client.query(
      `SELECT id, name, color FROM tags
       WHERE project_id = $1
       ORDER BY name ASC`,
      [projectId]
    );

    // Count sources
    const sourcesCountResult = await client.query(
      `SELECT COUNT(*) FROM sources WHERE project_id = $1 AND deleted_at IS NULL`,
      [projectId]
    );

    // Count highlights
    const highlightsCountResult = await client.query(
      `SELECT COUNT(*) FROM highlights h
       JOIN transcript_segments ts ON ts.id = h.segment_id
       JOIN sources s ON s.id = ts.source_id
       WHERE s.project_id = $1 AND s.deleted_at IS NULL`,
      [projectId]
    );

    return {
      id: p.id,
      name: p.name,
      description: p.description,
      updatedAt: p.updated_at,
      workspace: {
        id: p.workspace_id,
        name: p.workspace_name,
        slug: p.workspace_slug,
      },
      sources: sourcesResult.rows,
      tags: tagsResult.rows,
      sourcesCount: parseInt(sourcesCountResult.rows[0].count, 10),
      highlightsCount: parseInt(highlightsCountResult.rows[0].count, 10),
    };
  });
}

// ============================================
// INSIGHTS PAGE QUERIES
// ============================================

export interface ThemeHighlight {
  id: string;
  note: string | null;
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
    source: {
      id: string;
      title: string;
    };
  };
}

export interface ThemeWithHighlights {
  id: string;
  name: string;
  description: string | null;
  color: string;
  highlights: ThemeHighlight[];
}

export interface InsightsPageData {
  id: string;
  name: string;
  description: string | null;
  updatedAt: Date;
  workspace: {
    id: string;
    name: string;
    slug: string;
  };
  themes: ThemeWithHighlights[];
  sourcesCount: number;
  highlightsCount: number;
}

/**
 * Get project data for insights page with themes and their highlights.
 */
export async function getProjectForInsightsPage(
  schemaName: string,
  projectId: string
): Promise<InsightsPageData | null> {
  return withTenantSchema(schemaName, async (client) => {
    // Get project with workspace
    const projectResult = await client.query(
      `SELECT p.*, w.id as workspace_id, w.name as workspace_name, w.slug as workspace_slug
       FROM projects p
       JOIN workspaces w ON w.id = p.workspace_id
       WHERE p.id = $1`,
      [projectId]
    );
    if (projectResult.rows.length === 0) return null;
    const p = projectResult.rows[0];

    // Get themes
    const themesResult = await client.query(
      `SELECT id, name, description, color FROM themes
       WHERE project_id = $1
       ORDER BY name ASC`,
      [projectId]
    );

    // Get all highlights for all themes in one query
    const themeIds = themesResult.rows.map((t) => t.id);
    const highlightsByTheme = new Map<string, ThemeHighlight[]>();

    if (themeIds.length > 0) {
      const highlightsResult = await client.query(
        `SELECT ht.theme_id, h.id, h.note,
                t.id as tag_id, t.name as tag_name, t.color as tag_color,
                ts.id as segment_id, ts.content, ts.start_time, ts.end_time,
                s.id as source_id, s.title as source_title
         FROM highlight_themes ht
         JOIN highlights h ON h.id = ht.highlight_id
         JOIN tags t ON t.id = h.tag_id
         JOIN transcript_segments ts ON ts.id = h.segment_id
         JOIN sources s ON s.id = ts.source_id
         WHERE ht.theme_id = ANY($1) AND s.deleted_at IS NULL
         ORDER BY ts.start_time ASC`,
        [themeIds]
      );

      for (const row of highlightsResult.rows) {
        const themeId = row.theme_id;
        if (!highlightsByTheme.has(themeId)) {
          highlightsByTheme.set(themeId, []);
        }
        highlightsByTheme.get(themeId)!.push({
          id: row.id,
          note: row.note,
          tag: {
            id: row.tag_id,
            name: row.tag_name,
            color: row.tag_color,
          },
          segment: {
            id: row.segment_id,
            content: row.content,
            startTime: row.start_time,
            endTime: row.end_time,
            source: {
              id: row.source_id,
              title: row.source_title,
            },
          },
        });
      }
    }

    // Build themes with highlights
    const themes: ThemeWithHighlights[] = themesResult.rows.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      color: t.color,
      highlights: highlightsByTheme.get(t.id) || [],
    }));

    // Count sources
    const sourcesCountResult = await client.query(
      `SELECT COUNT(*) FROM sources WHERE project_id = $1 AND deleted_at IS NULL`,
      [projectId]
    );

    // Count highlights
    const highlightsCountResult = await client.query(
      `SELECT COUNT(*) FROM highlights h
       JOIN transcript_segments ts ON ts.id = h.segment_id
       JOIN sources s ON s.id = ts.source_id
       WHERE s.project_id = $1 AND s.deleted_at IS NULL`,
      [projectId]
    );

    return {
      id: p.id,
      name: p.name,
      description: p.description,
      updatedAt: p.updated_at,
      workspace: {
        id: p.workspace_id,
        name: p.workspace_name,
        slug: p.workspace_slug,
      },
      themes,
      sourcesCount: parseInt(sourcesCountResult.rows[0].count, 10),
      highlightsCount: parseInt(highlightsCountResult.rows[0].count, 10),
    };
  });
}

/**
 * Get unassigned highlights (not in any theme) for a project.
 */
export async function listUnassignedHighlights(
  schemaName: string,
  projectId: string
): Promise<ThemeHighlight[]> {
  return withTenantSchema(schemaName, async (client) => {
    const result = await client.query(
      `SELECT h.id, h.note,
              t.id as tag_id, t.name as tag_name, t.color as tag_color,
              ts.id as segment_id, ts.content, ts.start_time, ts.end_time,
              s.id as source_id, s.title as source_title
       FROM highlights h
       JOIN tags t ON t.id = h.tag_id
       JOIN transcript_segments ts ON ts.id = h.segment_id
       JOIN sources s ON s.id = ts.source_id
       WHERE s.project_id = $1 AND s.deleted_at IS NULL
         AND NOT EXISTS (SELECT 1 FROM highlight_themes ht WHERE ht.highlight_id = h.id)
       ORDER BY h.created_at DESC`,
      [projectId]
    );

    return result.rows.map((row) => ({
      id: row.id,
      note: row.note,
      tag: {
        id: row.tag_id,
        name: row.tag_name,
        color: row.tag_color,
      },
      segment: {
        id: row.segment_id,
        content: row.content,
        startTime: row.start_time,
        endTime: row.end_time,
        source: {
          id: row.source_id,
          title: row.source_title,
        },
      },
    }));
  });
}

// ============================================
// SHARE LINK QUERIES (for public routes)
// ============================================

export interface ShareLinkWithProject {
  id: string;
  token: string;
  projectId: string;
  sourceId: string | null;
  shareType: string;
  includeEvidence: boolean;
  includeInsights: boolean;
  isActive: boolean;
  expiresAt: Date | null;
  createdAt: Date;
  project: {
    id: string;
    name: string;
    description: string | null;
  };
  source: {
    id: string;
    title: string;
  } | null;
}

/**
 * Validate a share link token from tenant schema.
 * Returns null if invalid, expired, or inactive.
 */
export async function validateShareLinkTenant(
  schemaName: string,
  token: string
): Promise<ShareLinkWithProject | null> {
  return withTenantSchema(schemaName, async (client) => {
    const result = await client.query(
      `SELECT sl.*, p.id as project_id_rel, p.name as project_name, p.description as project_description,
              s.id as source_id_rel, s.title as source_title
       FROM share_links sl
       JOIN projects p ON p.id = sl.project_id
       LEFT JOIN sources s ON s.id = sl.source_id
       WHERE sl.token = $1`,
      [token]
    );

    if (result.rows.length === 0) return null;
    const row = result.rows[0];

    // Check if link is active
    if (!row.is_active) return null;

    // Check if link has expired
    if (row.expires_at && new Date(row.expires_at) < new Date()) return null;

    return {
      id: row.id,
      token: row.token,
      projectId: row.project_id,
      sourceId: row.source_id,
      shareType: row.share_type,
      includeEvidence: row.include_evidence,
      includeInsights: row.include_insights,
      isActive: row.is_active,
      expiresAt: row.expires_at,
      createdAt: row.created_at,
      project: {
        id: row.project_id_rel,
        name: row.project_name,
        description: row.project_description,
      },
      source: row.source_id
        ? {
            id: row.source_id_rel,
            title: row.source_title,
          }
        : null,
    };
  });
}

/**
 * Get source info for public streaming.
 */
export async function getSourceForPublicStream(
  schemaName: string,
  sourceId: string
): Promise<{ projectId: string; fileUrl: string | null; fileType: string } | null> {
  return withTenantSchema(schemaName, async (client) => {
    const result = await client.query(
      `SELECT project_id, file_url, file_type FROM sources WHERE id = $1 AND deleted_at IS NULL`,
      [sourceId]
    );
    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    return {
      projectId: row.project_id,
      fileUrl: row.file_url,
      fileType: row.file_type,
    };
  });
}

// ============================================
// EXPORT QUERIES
// ============================================

export interface ProjectExportData {
  id: string;
  name: string;
  createdAt: Date;
  workspace: {
    name: string;
  };
  themes: Array<{
    id: string;
    name: string;
    description: string | null;
    color: string;
    highlights: Array<{
      highlight: {
        id: string;
        note: string | null;
        tag: {
          name: string;
          color: string;
        };
        segment: {
          content: string;
          startTime: number;
          endTime: number;
          source: {
            title: string;
          };
        };
      };
    }>;
  }>;
}

/**
 * Get project data for export with all nested relations.
 * Used by the export route to generate Markdown/PDF.
 */
export async function getProjectForExport(
  schemaName: string,
  projectId: string,
  themeId?: string | null
): Promise<ProjectExportData | null> {
  return withTenantSchema(schemaName, async (client) => {
    // Get project with workspace
    const projectResult = await client.query(
      `SELECT p.*, w.name as workspace_name
       FROM projects p
       JOIN workspaces w ON w.id = p.workspace_id
       WHERE p.id = $1`,
      [projectId]
    );
    if (projectResult.rows.length === 0) return null;
    const projectRow = projectResult.rows[0];

    // Get themes (optionally filtered by themeId)
    const themesQuery = themeId
      ? `SELECT * FROM themes WHERE project_id = $1 AND id = $2 ORDER BY name ASC`
      : `SELECT * FROM themes WHERE project_id = $1 ORDER BY name ASC`;
    const themesParams = themeId ? [projectId, themeId] : [projectId];
    const themesResult = await client.query(themesQuery, themesParams);

    // Build theme data with highlights
    const themes: ProjectExportData['themes'] = [];

    for (const themeRow of themesResult.rows) {
      // Get highlights for this theme with all nested data
      const highlightsResult = await client.query(
        `SELECT ht.highlight_id, h.note, h.selected_text,
                t.name as tag_name, t.color as tag_color,
                ts.content as segment_content, ts.start_time, ts.end_time,
                s.title as source_title
         FROM highlight_themes ht
         JOIN highlights h ON h.id = ht.highlight_id
         JOIN tags t ON t.id = h.tag_id
         JOIN transcript_segments ts ON ts.id = h.segment_id
         JOIN sources s ON s.id = ts.source_id
         WHERE ht.theme_id = $1
         ORDER BY ts.start_time ASC`,
        [themeRow.id]
      );

      const highlights = highlightsResult.rows.map((row) => ({
        highlight: {
          id: row.highlight_id,
          note: row.note,
          tag: {
            name: row.tag_name,
            color: row.tag_color,
          },
          segment: {
            content: row.segment_content,
            startTime: row.start_time,
            endTime: row.end_time,
            source: {
              title: row.source_title,
            },
          },
        },
      }));

      themes.push({
        id: themeRow.id,
        name: themeRow.name,
        description: themeRow.description,
        color: themeRow.color,
        highlights,
      });
    }

    return {
      id: projectRow.id,
      name: projectRow.name,
      createdAt: projectRow.created_at,
      workspace: {
        name: projectRow.workspace_name,
      },
      themes,
    };
  });
}

// ============================================
// SHARE PAGE QUERIES
// ============================================

export interface SharedSourceData {
  id: string;
  title: string;
  fileUrl: string;
  duration: number | null;
  status: string;
  createdAt: Date;
  summary: Record<string, unknown> | null;
  summaryStatus: string;
  summaryGeneratedAt: Date | null;
  project: {
    id: string;
    name: string;
    workspace: { name: string };
    tags: Array<{ id: string; name: string; color: string }>;
  };
  segments: Array<{
    id: string;
    content: string;
    startTime: number;
    endTime: number;
    speakerId: string | null;
    highlights: Array<{
      id: string;
      selectedText: string | null;
      tag: { id: string; name: string; color: string };
    }>;
  }>;
}

/**
 * Get source data for share page view.
 */
export async function getSourceForShareView(
  schemaName: string,
  sourceId: string
): Promise<SharedSourceData | null> {
  return withTenantSchema(schemaName, async (client) => {
    // Get source
    const sourceResult = await client.query(
      `SELECT id, title, file_url, duration, status, created_at,
              summary, summary_status, summary_generated_at, project_id
       FROM sources WHERE id = $1`,
      [sourceId]
    );
    if (sourceResult.rows.length === 0) return null;
    const s = sourceResult.rows[0];

    // Get project with workspace
    const projectResult = await client.query(
      `SELECT p.id, p.name, w.name as workspace_name
       FROM projects p
       JOIN workspaces w ON w.id = p.workspace_id
       WHERE p.id = $1`,
      [s.project_id]
    );
    if (projectResult.rows.length === 0) return null;
    const p = projectResult.rows[0];

    // Get project tags
    const tagsResult = await client.query(
      `SELECT id, name, color FROM tags WHERE project_id = $1 ORDER BY name ASC`,
      [s.project_id]
    );

    // Get segments with highlights
    const segmentsResult = await client.query(
      `SELECT id, content, start_time, end_time, speaker_id
       FROM transcript_segments WHERE source_id = $1
       ORDER BY start_time ASC`,
      [sourceId]
    );

    // Get highlights for all segments
    const segmentIds = segmentsResult.rows.map((seg) => seg.id);
    const highlightsBySegment = new Map<
      string,
      Array<{
        id: string;
        selectedText: string | null;
        tag: { id: string; name: string; color: string };
      }>
    >();

    if (segmentIds.length > 0) {
      const highlightsResult = await client.query(
        `SELECT h.id, h.segment_id, h.selected_text,
                t.id as tag_id, t.name as tag_name, t.color as tag_color
         FROM highlights h
         JOIN tags t ON t.id = h.tag_id
         WHERE h.segment_id = ANY($1)`,
        [segmentIds]
      );

      for (const row of highlightsResult.rows) {
        if (!highlightsBySegment.has(row.segment_id)) {
          highlightsBySegment.set(row.segment_id, []);
        }
        highlightsBySegment.get(row.segment_id)!.push({
          id: row.id,
          selectedText: row.selected_text,
          tag: { id: row.tag_id, name: row.tag_name, color: row.tag_color },
        });
      }
    }

    return {
      id: s.id,
      title: s.title,
      fileUrl: s.file_url,
      duration: s.duration,
      status: s.status,
      createdAt: s.created_at,
      summary: s.summary,
      summaryStatus: s.summary_status,
      summaryGeneratedAt: s.summary_generated_at,
      project: {
        id: p.id,
        name: p.name,
        workspace: { name: p.workspace_name },
        tags: tagsResult.rows,
      },
      segments: segmentsResult.rows.map((seg) => ({
        id: seg.id,
        content: seg.content,
        startTime: seg.start_time,
        endTime: seg.end_time,
        speakerId: seg.speaker_id,
        highlights: highlightsBySegment.get(seg.id) || [],
      })),
    };
  });
}

export interface SharedProjectSource {
  id: string;
  title: string;
  fileName: string;
  fileType: string;
  status: string;
  duration: number | null;
  createdAt: Date;
  updatedAt: Date;
  processingStep: string | null;
  processingProgress: number;
  processingStartedAt: Date | null;
  tags: Array<{ id: string; name: string; color: string }>;
  highlightCount: number;
  segmentsCount: number;
}

export interface SharedProjectData {
  id: string;
  name: string;
  description: string | null;
  updatedAt: Date;
  summary: Record<string, unknown> | null;
  summaryStatus: string;
  summaryGeneratedAt: Date | null;
  sourcesCount: number;
  sources: SharedProjectSource[];
  tags: Array<{ id: string; name: string; color: string }>;
}

/**
 * Get project data for share page view.
 */
export async function getProjectForShareView(
  schemaName: string,
  projectId: string
): Promise<SharedProjectData | null> {
  return withTenantSchema(schemaName, async (client) => {
    // Get project
    const projectResult = await client.query(
      `SELECT id, name, description, updated_at, summary, summary_status, summary_generated_at
       FROM projects WHERE id = $1`,
      [projectId]
    );
    if (projectResult.rows.length === 0) return null;
    const p = projectResult.rows[0];

    // Get sources
    const sourcesResult = await client.query(
      `SELECT id, title, file_name, file_type, status, duration, created_at, updated_at,
              processing_step, processing_progress, processing_started_at
       FROM sources WHERE project_id = $1 AND deleted_at IS NULL
       ORDER BY created_at DESC`,
      [projectId]
    );

    // Get tag aggregations per source
    const tagsResult = await client.query(
      `SELECT ts.source_id, t.id as tag_id, t.name as tag_name, t.color as tag_color
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

    // Get project tags
    const projectTagsResult = await client.query(
      `SELECT id, name, color FROM tags WHERE project_id = $1 ORDER BY name ASC`,
      [projectId]
    );

    // Build lookup maps
    const tagsBySource = new Map<string, Array<{ id: string; name: string; color: string }>>();
    for (const row of tagsResult.rows) {
      if (!tagsBySource.has(row.source_id)) {
        tagsBySource.set(row.source_id, []);
      }
      tagsBySource.get(row.source_id)!.push({
        id: row.tag_id,
        name: row.tag_name,
        color: row.tag_color,
      });
    }

    const highlightCountBySource = new Map<string, number>();
    for (const row of highlightCountsResult.rows) {
      highlightCountBySource.set(row.source_id, parseInt(row.count, 10));
    }

    const segmentCountBySource = new Map<string, number>();
    for (const row of segmentCountsResult.rows) {
      segmentCountBySource.set(row.source_id, parseInt(row.count, 10));
    }

    const sources: SharedProjectSource[] = sourcesResult.rows.map((row) => ({
      id: row.id,
      title: row.title,
      fileName: row.file_name,
      fileType: row.file_type,
      status: row.status,
      duration: row.duration,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      processingStep: row.processing_step,
      processingProgress: row.processing_progress || 0,
      processingStartedAt: row.processing_started_at,
      tags: tagsBySource.get(row.id) || [],
      highlightCount: highlightCountBySource.get(row.id) || 0,
      segmentsCount: segmentCountBySource.get(row.id) || 0,
    }));

    return {
      id: p.id,
      name: p.name,
      description: p.description,
      updatedAt: p.updated_at,
      summary: p.summary,
      summaryStatus: p.summary_status,
      summaryGeneratedAt: p.summary_generated_at,
      sourcesCount: sources.length,
      sources,
      tags: projectTagsResult.rows,
    };
  });
}

/**
 * Count highlights in a project.
 */
export async function countHighlightsInProject(
  schemaName: string,
  projectId: string
): Promise<number> {
  return withTenantSchema(schemaName, async (client) => {
    const result = await client.query(
      `SELECT COUNT(*) FROM highlights h
       JOIN transcript_segments ts ON ts.id = h.segment_id
       JOIN sources s ON s.id = ts.source_id
       WHERE s.project_id = $1 AND s.deleted_at IS NULL`,
      [projectId]
    );
    return parseInt(result.rows[0].count, 10);
  });
}

/**
 * Get highlights for evidence page (shared view).
 */
export async function getHighlightsForEvidencePage(
  schemaName: string,
  projectId: string
): Promise<
  Array<{
    id: string;
    note: string | null;
    selectedText: string | null;
    createdAt: Date;
    tag: { id: string; name: string; color: string };
    segment: {
      id: string;
      content: string;
      startTime: number;
      endTime: number;
      speakerId: string | null;
    };
    source: { id: string; title: string; fileUrl: string };
  }>
> {
  return withTenantSchema(schemaName, async (client) => {
    const result = await client.query(
      `SELECT h.id, h.note, h.selected_text, h.created_at,
              t.id as tag_id, t.name as tag_name, t.color as tag_color,
              ts.id as segment_id, ts.content, ts.start_time, ts.end_time, ts.speaker_id,
              s.id as source_id, s.title as source_title, s.file_url
       FROM highlights h
       JOIN tags t ON t.id = h.tag_id
       JOIN transcript_segments ts ON ts.id = h.segment_id
       JOIN sources s ON s.id = ts.source_id
       WHERE s.project_id = $1 AND s.deleted_at IS NULL
       ORDER BY h.created_at DESC`,
      [projectId]
    );

    return result.rows.map((row) => ({
      id: row.id,
      note: row.note,
      selectedText: row.selected_text,
      createdAt: row.created_at,
      tag: { id: row.tag_id, name: row.tag_name, color: row.tag_color },
      segment: {
        id: row.segment_id,
        content: row.content,
        startTime: row.start_time,
        endTime: row.end_time,
        speakerId: row.speaker_id,
      },
      source: { id: row.source_id, title: row.source_title, fileUrl: row.file_url },
    }));
  });
}

/**
 * Get project data for shared insights page.
 */
export async function getProjectForShareInsights(
  schemaName: string,
  projectId: string
): Promise<{
  id: string;
  name: string;
  description: string | null;
  updatedAt: Date;
  workspace: { id: string; name: string; slug: string };
  themes: Array<{
    id: string;
    name: string;
    description: string | null;
    color: string;
    highlights: Array<{
      id: string;
      note: string | null;
      tag: { id: string; name: string; color: string };
      segment: {
        id: string;
        content: string;
        startTime: number;
        endTime: number;
        speakerId: string | null;
        source: { id: string; title: string };
      };
    }>;
  }>;
  sourcesCount: number;
} | null> {
  return withTenantSchema(schemaName, async (client) => {
    // Get project with workspace
    const projectResult = await client.query(
      `SELECT p.*, w.id as workspace_id, w.name as workspace_name, w.slug as workspace_slug
       FROM projects p
       JOIN workspaces w ON w.id = p.workspace_id
       WHERE p.id = $1`,
      [projectId]
    );
    if (projectResult.rows.length === 0) return null;
    const p = projectResult.rows[0];

    // Get themes
    const themesResult = await client.query(
      `SELECT id, name, description, color FROM themes WHERE project_id = $1 ORDER BY name ASC`,
      [projectId]
    );

    // Get all highlights for all themes
    const themeIds = themesResult.rows.map((t) => t.id);
    const highlightsByTheme = new Map<
      string,
      Array<{
        id: string;
        note: string | null;
        tag: { id: string; name: string; color: string };
        segment: {
          id: string;
          content: string;
          startTime: number;
          endTime: number;
          speakerId: string | null;
          source: { id: string; title: string };
        };
      }>
    >();

    if (themeIds.length > 0) {
      const highlightsResult = await client.query(
        `SELECT ht.theme_id, h.id, h.note,
                t.id as tag_id, t.name as tag_name, t.color as tag_color,
                ts.id as segment_id, ts.content, ts.start_time, ts.end_time, ts.speaker_id,
                s.id as source_id, s.title as source_title
         FROM highlight_themes ht
         JOIN highlights h ON h.id = ht.highlight_id
         JOIN tags t ON t.id = h.tag_id
         JOIN transcript_segments ts ON ts.id = h.segment_id
         JOIN sources s ON s.id = ts.source_id
         WHERE ht.theme_id = ANY($1) AND s.deleted_at IS NULL`,
        [themeIds]
      );

      for (const row of highlightsResult.rows) {
        if (!highlightsByTheme.has(row.theme_id)) {
          highlightsByTheme.set(row.theme_id, []);
        }
        highlightsByTheme.get(row.theme_id)!.push({
          id: row.id,
          note: row.note,
          tag: { id: row.tag_id, name: row.tag_name, color: row.tag_color },
          segment: {
            id: row.segment_id,
            content: row.content,
            startTime: row.start_time,
            endTime: row.end_time,
            speakerId: row.speaker_id,
            source: { id: row.source_id, title: row.source_title },
          },
        });
      }
    }

    // Count sources
    const sourcesCountResult = await client.query(
      `SELECT COUNT(*) FROM sources WHERE project_id = $1 AND deleted_at IS NULL`,
      [projectId]
    );

    return {
      id: p.id,
      name: p.name,
      description: p.description,
      updatedAt: p.updated_at,
      workspace: {
        id: p.workspace_id,
        name: p.workspace_name,
        slug: p.workspace_slug,
      },
      themes: themesResult.rows.map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        color: t.color,
        highlights: highlightsByTheme.get(t.id) || [],
      })),
      sourcesCount: parseInt(sourcesCountResult.rows[0].count, 10),
    };
  });
}
