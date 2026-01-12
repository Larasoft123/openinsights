import { withTenantSchema } from '../tenant';
import type { TenantShareLink } from './types';

// ============================================
// SHARE LINK QUERIES (for public routes)
// ============================================

export interface ShareLinkWithProject {
  id: string;
  token: string;
  projectId: string;
  sourceId: string | null;
  shareType: 'project' | 'source';
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

// ============================================
// SHARE LINK QUERIES (CRUD operations)
// ============================================

export interface ShareLinkWithDetails extends TenantShareLink {
  project: { id: string; name: string };
  source: { id: string; title: string } | null;
  createdBy: { id: string; name: string | null; email: string } | null;
}

/**
 * Create a share link for a project
 */
export async function createProjectShareLinkTenant(
  schemaName: string,
  projectId: string,
  userId: string,
  options: {
    includeEvidence?: boolean;
    includeInsights?: boolean;
    expiresAt?: Date | null;
  } = {}
): Promise<ShareLinkWithDetails> {
  const { includeEvidence = true, includeInsights = true, expiresAt = null } = options;

  return withTenantSchema(schemaName, async (client) => {
    const result = await client.query(
      `INSERT INTO share_links (project_id, share_type, created_by_id, include_evidence, include_insights, expires_at)
       VALUES ($1, 'project', $2, $3, $4, $5)
       RETURNING *`,
      [projectId, userId, includeEvidence, includeInsights, expiresAt]
    );
    const link = result.rows[0];

    // Fetch project info
    const projectResult = await client.query(`SELECT id, name FROM projects WHERE id = $1`, [
      projectId,
    ]);
    const project = projectResult.rows[0];

    return {
      id: link.id,
      token: link.token,
      projectId: link.project_id,
      sourceId: link.source_id,
      shareType: link.share_type as 'project' | 'source',
      createdById: link.created_by_id,
      includeEvidence: link.include_evidence,
      includeInsights: link.include_insights,
      expiresAt: link.expires_at,
      isActive: link.is_active,
      createdAt: link.created_at,
      updatedAt: link.updated_at,
      project: { id: project.id, name: project.name },
      source: null,
      createdBy: null,
    };
  });
}

/**
 * Create a share link for a source
 */
export async function createSourceShareLinkTenant(
  schemaName: string,
  sourceId: string,
  userId: string,
  options: { expiresAt?: Date | null } = {}
): Promise<ShareLinkWithDetails> {
  const { expiresAt = null } = options;

  return withTenantSchema(schemaName, async (client) => {
    // Get source to find its project
    const sourceResult = await client.query(
      `SELECT id, project_id, title FROM sources WHERE id = $1`,
      [sourceId]
    );
    if (sourceResult.rows.length === 0) {
      throw new Error('Source not found');
    }
    const source = sourceResult.rows[0];

    const result = await client.query(
      `INSERT INTO share_links (project_id, source_id, share_type, created_by_id, include_evidence, include_insights, expires_at)
       VALUES ($1, $2, 'source', $3, true, false, $4)
       RETURNING *`,
      [source.project_id, sourceId, userId, expiresAt]
    );
    const link = result.rows[0];

    // Fetch project info
    const projectResult = await client.query(`SELECT id, name FROM projects WHERE id = $1`, [
      source.project_id,
    ]);
    const project = projectResult.rows[0];

    return {
      id: link.id,
      token: link.token,
      projectId: link.project_id,
      sourceId: link.source_id,
      shareType: link.share_type as 'project' | 'source',
      createdById: link.created_by_id,
      includeEvidence: link.include_evidence,
      includeInsights: link.include_insights,
      expiresAt: link.expires_at,
      isActive: link.is_active,
      createdAt: link.created_at,
      updatedAt: link.updated_at,
      project: { id: project.id, name: project.name },
      source: { id: source.id, title: source.title },
      createdBy: null,
    };
  });
}

/**
 * Get all share links for a project (project-level only, not source shares)
 */
export async function listProjectShareLinksTenant(
  schemaName: string,
  projectId: string
): Promise<ShareLinkWithDetails[]> {
  return withTenantSchema(schemaName, async (client) => {
    const result = await client.query(
      `SELECT sl.*, p.name as project_name
       FROM share_links sl
       JOIN projects p ON p.id = sl.project_id
       WHERE sl.project_id = $1 AND sl.source_id IS NULL
       ORDER BY sl.created_at DESC`,
      [projectId]
    );

    return result.rows.map((row) => ({
      id: row.id,
      token: row.token,
      projectId: row.project_id,
      sourceId: row.source_id,
      shareType: row.share_type as 'project' | 'source',
      createdById: row.created_by_id,
      includeEvidence: row.include_evidence,
      includeInsights: row.include_insights,
      expiresAt: row.expires_at,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      project: { id: row.project_id, name: row.project_name },
      source: null,
      createdBy: null,
    }));
  });
}

/**
 * Get all share links for a source
 */
export async function listSourceShareLinksTenant(
  schemaName: string,
  sourceId: string
): Promise<ShareLinkWithDetails[]> {
  return withTenantSchema(schemaName, async (client) => {
    const result = await client.query(
      `SELECT sl.*, p.name as project_name, s.title as source_title
       FROM share_links sl
       JOIN projects p ON p.id = sl.project_id
       JOIN sources s ON s.id = sl.source_id
       WHERE sl.source_id = $1
       ORDER BY sl.created_at DESC`,
      [sourceId]
    );

    return result.rows.map((row) => ({
      id: row.id,
      token: row.token,
      projectId: row.project_id,
      sourceId: row.source_id,
      shareType: row.share_type as 'project' | 'source',
      createdById: row.created_by_id,
      includeEvidence: row.include_evidence,
      includeInsights: row.include_insights,
      expiresAt: row.expires_at,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      project: { id: row.project_id, name: row.project_name },
      source: { id: row.source_id, title: row.source_title },
      createdBy: null,
    }));
  });
}

/**
 * Revoke a share link
 */
export async function revokeShareLinkTenant(
  schemaName: string,
  linkId: string,
  userId: string
): Promise<TenantShareLink> {
  return withTenantSchema(schemaName, async (client) => {
    // Verify ownership
    const checkResult = await client.query(`SELECT created_by_id FROM share_links WHERE id = $1`, [
      linkId,
    ]);

    if (checkResult.rows.length === 0) {
      throw new Error('Share link not found');
    }

    if (checkResult.rows[0].created_by_id !== userId) {
      throw new Error('Not authorized to revoke this link');
    }

    const result = await client.query(
      `UPDATE share_links SET is_active = false WHERE id = $1 RETURNING *`,
      [linkId]
    );

    const row = result.rows[0];
    return {
      id: row.id,
      token: row.token,
      projectId: row.project_id,
      sourceId: row.source_id,
      shareType: row.share_type as 'project' | 'source',
      createdById: row.created_by_id,
      includeEvidence: row.include_evidence,
      includeInsights: row.include_insights,
      expiresAt: row.expires_at,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  });
}
