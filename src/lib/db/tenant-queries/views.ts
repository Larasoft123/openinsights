import { withTenantSchema } from '../tenant';
import type {
  TenantProject,
  TenantSource,
  TenantSegment,
  TenantHighlight,
  TenantTag,
} from './types';

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
      language: projectRow.language || 'en',
      archivedAt: projectRow.archived_at,
      summary: projectRow.summary,
      summaryStatus: projectRow.summary_status,
      summaryGeneratedAt: projectRow.summary_generated_at,
      // Project Settings
      projectType: projectRow.project_type,
      goals: projectRow.goals,
      context: projectRow.context,
      deadline: projectRow.deadline,
      stakeholder: projectRow.stakeholder,
      researchQuestions: projectRow.research_questions,
      targetParticipants: projectRow.target_participants,
      recruitmentCriteria: projectRow.recruitment_criteria,
      // AI Prompt Configuration
      sourceSummaryPrompt: projectRow.source_summary_prompt,
      projectSummaryPrompt: projectRow.project_summary_prompt,
      themeNamingPrompt: projectRow.theme_naming_prompt,
      autoTaggingPrompt: projectRow.auto_tagging_prompt,
      autoTaggingEnabled: projectRow.auto_tagging_enabled ?? false,
      // Transcription Configuration
      transcriptionVocabulary: projectRow.transcription_vocabulary,
      transcriptionContext: projectRow.transcription_context,
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
      description: sourceRow.description || null,
      fileName: sourceRow.file_name,
      fileUrl: sourceRow.file_url,
      fileType: sourceRow.file_type,
      duration: sourceRow.duration,
      status: sourceRow.status,
      language: sourceRow.language || 'auto',
      detectedLanguage: sourceRow.detected_language,
      processingStep: sourceRow.processing_step,
      processingProgress: sourceRow.processing_progress || 0,
      processingStartedAt: sourceRow.processing_started_at,
      deletedAt: sourceRow.deleted_at,
      thumbnailUrl: sourceRow.thumbnail_url,
      summary: sourceRow.summary,
      summaryStatus: sourceRow.summary_status,
      summaryGeneratedAt: sourceRow.summary_generated_at,
      autoTaggingStatus: sourceRow.auto_tagging_status || null,
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
  language: string;
  archivedAt: Date | null;
  updatedAt: Date;
  sourceThumbnails: string[];
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
 * Only returns active (non-archived) projects.
 */
export async function listRecentProjects(
  schemaName: string,
  workspaceId: string,
  limit: number = 6
): Promise<DashboardProject[]> {
  return withTenantSchema(schemaName, async (client) => {
    const result = await client.query(
      `SELECT p.id, p.name, p.description, p.language, p.archived_at, p.updated_at,
              (SELECT COUNT(*) FROM sources s WHERE s.project_id = p.id AND s.deleted_at IS NULL) as source_count,
              (SELECT COUNT(*) FROM highlights h JOIN transcript_segments ts ON ts.id = h.segment_id JOIN sources s ON s.id = ts.source_id WHERE s.project_id = p.id AND s.deleted_at IS NULL) as highlight_count,
              (SELECT COALESCE(array_agg(id::text), ARRAY[]::text[])
               FROM (SELECT id FROM sources
                     WHERE project_id = p.id
                       AND deleted_at IS NULL
                       AND thumbnail_url IS NOT NULL
                     ORDER BY created_at DESC
                     LIMIT 6) sub) as source_thumbnail_ids
       FROM projects p
       WHERE p.workspace_id = $1 AND p.archived_at IS NULL
       ORDER BY p.updated_at DESC
       LIMIT $2`,
      [workspaceId, limit]
    );
    return result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      language: row.language || 'en',
      archivedAt: row.archived_at,
      updatedAt: row.updated_at,
      sourceThumbnails: (row.source_thumbnail_ids || []).map(
        (id: string) => `/api/sources/${id}/thumbnail`
      ),
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
  language: string;
  archivedAt: Date | null;
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
      language: p.language || 'en',
      archivedAt: p.archived_at,
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
  language: string;
  archivedAt: Date | null;
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
      language: p.language || 'en',
      archivedAt: p.archived_at,
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
