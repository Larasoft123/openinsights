import { withTenantSchema } from '../tenant';
import type { TenantProject } from './types';
import { toCamelCase } from './utils';

// ============================================
// PROJECT QUERIES
// ============================================

export type ProjectFilter = 'active' | 'archived' | 'all';

export interface ProjectWithThumbnails extends TenantProject {
  sourceThumbnailIds: string[];
}

export async function listProjects(
  schemaName: string,
  workspaceId: string,
  filter: ProjectFilter = 'active'
): Promise<ProjectWithThumbnails[]> {
  return withTenantSchema(schemaName, async (client) => {
    let whereClause = 'p.workspace_id = $1';
    if (filter === 'active') {
      whereClause += ' AND p.archived_at IS NULL';
    } else if (filter === 'archived') {
      whereClause += ' AND p.archived_at IS NOT NULL';
    }
    // 'all' - no additional filter

    const result = await client.query(
      `SELECT p.*,
              (SELECT COUNT(*) FROM sources s WHERE s.project_id = p.id AND s.deleted_at IS NULL) as source_count,
              (SELECT COUNT(*) FROM highlights h
               JOIN transcript_segments ts ON ts.id = h.segment_id
               JOIN sources s ON s.id = ts.source_id
               WHERE s.project_id = p.id AND s.deleted_at IS NULL) as highlight_count,
              (SELECT COALESCE(array_agg(id::text), ARRAY[]::text[])
               FROM (SELECT id FROM sources
                     WHERE project_id = p.id
                       AND deleted_at IS NULL
                       AND thumbnail_url IS NOT NULL
                     ORDER BY created_at DESC
                     LIMIT 3) sub) as source_thumbnail_ids
       FROM projects p
       WHERE ${whereClause}
       ORDER BY p.updated_at DESC`,
      [workspaceId]
    );
    return result.rows.map((row) => {
      const project = toCamelCase(row) as TenantProject & {
        sourceCount: string;
        highlightCount: string;
        sourceThumbnailIds: string[];
      };
      return {
        ...project,
        _count: {
          sources: parseInt(project.sourceCount, 10),
          highlights: parseInt(project.highlightCount, 10),
        },
        sourceThumbnailIds: project.sourceThumbnailIds || [],
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
              (SELECT COUNT(*) FROM sources s WHERE s.project_id = p.id AND s.deleted_at IS NULL) as source_count,
              (SELECT COUNT(*) FROM highlights h
               JOIN transcript_segments ts ON ts.id = h.segment_id
               JOIN sources s ON s.id = ts.source_id
               WHERE s.project_id = p.id AND s.deleted_at IS NULL) as highlight_count
       FROM projects p
       WHERE p.id = $1`,
      [projectId]
    );
    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    const project = toCamelCase(row) as TenantProject & {
      sourceCount: string;
      highlightCount: string;
    };
    return {
      ...project,
      _count: {
        sources: parseInt(project.sourceCount, 10),
        highlights: parseInt(project.highlightCount, 10),
      },
    };
  });
}

export async function createProject(
  schemaName: string,
  data: {
    workspaceId: string;
    name: string;
    description?: string | null;
    language?: string;
    // Project Settings
    projectType?: string | null;
    goals?: string | null;
    context?: string | null;
    deadline?: Date | null;
    stakeholder?: string | null;
    researchQuestions?: string | null;
    targetParticipants?: number | null;
    recruitmentCriteria?: string | null;
    // AI Prompt Configuration
    sourceSummaryPrompt?: string | null;
    projectSummaryPrompt?: string | null;
    themeNamingPrompt?: string | null;
    autoTaggingPrompt?: string | null;
    autoTaggingEnabled?: boolean;
    // Transcription Configuration
    transcriptionVocabulary?: string | null;
    transcriptionContext?: string | null;
  }
): Promise<TenantProject> {
  return withTenantSchema(schemaName, async (client) => {
    const result = await client.query(
      `INSERT INTO projects (
        workspace_id, name, description, language,
        project_type, goals, context, deadline, stakeholder,
        research_questions, target_participants, recruitment_criteria,
        source_summary_prompt, project_summary_prompt, theme_naming_prompt,
        auto_tagging_prompt, auto_tagging_enabled,
        transcription_vocabulary, transcription_context
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
       RETURNING *`,
      [
        data.workspaceId,
        data.name,
        data.description || null,
        data.language || 'en',
        data.projectType || null,
        data.goals || null,
        data.context || null,
        data.deadline || null,
        data.stakeholder || null,
        data.researchQuestions || null,
        data.targetParticipants || null,
        data.recruitmentCriteria || null,
        data.sourceSummaryPrompt || null,
        data.projectSummaryPrompt || null,
        data.themeNamingPrompt || null,
        data.autoTaggingPrompt || null,
        data.autoTaggingEnabled ?? false,
        data.transcriptionVocabulary || null,
        data.transcriptionContext || null,
      ]
    );
    const project = toCamelCase(result.rows[0]) as TenantProject;
    return { ...project, _count: { sources: 0, highlights: 0 } };
  });
}

export async function updateProject(
  schemaName: string,
  projectId: string,
  data: Partial<{
    name: string;
    description: string | null;
    language: string;
    archivedAt: Date | null;
    summary: Record<string, unknown> | null;
    summaryStatus: string;
    summaryGeneratedAt: Date | null;
    // Project Settings
    projectType: string | null;
    goals: string | null;
    context: string | null;
    deadline: Date | null;
    stakeholder: string | null;
    researchQuestions: string | null;
    targetParticipants: number | null;
    recruitmentCriteria: string | null;
    // AI Prompt Configuration
    sourceSummaryPrompt: string | null;
    projectSummaryPrompt: string | null;
    themeNamingPrompt: string | null;
    autoTaggingPrompt: string | null;
    autoTaggingEnabled: boolean;
    // Transcription Configuration
    transcriptionVocabulary: string | null;
    transcriptionContext: string | null;
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
    if (data.language !== undefined) {
      setClauses.push(`language = $${paramIndex++}`);
      values.push(data.language);
    }
    if (data.archivedAt !== undefined) {
      setClauses.push(`archived_at = $${paramIndex++}`);
      values.push(data.archivedAt);
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
    // Project Settings fields
    if (data.projectType !== undefined) {
      setClauses.push(`project_type = $${paramIndex++}`);
      values.push(data.projectType);
    }
    if (data.goals !== undefined) {
      setClauses.push(`goals = $${paramIndex++}`);
      values.push(data.goals);
    }
    if (data.context !== undefined) {
      setClauses.push(`context = $${paramIndex++}`);
      values.push(data.context);
    }
    if (data.deadline !== undefined) {
      setClauses.push(`deadline = $${paramIndex++}`);
      values.push(data.deadline);
    }
    if (data.stakeholder !== undefined) {
      setClauses.push(`stakeholder = $${paramIndex++}`);
      values.push(data.stakeholder);
    }
    if (data.researchQuestions !== undefined) {
      setClauses.push(`research_questions = $${paramIndex++}`);
      values.push(data.researchQuestions);
    }
    if (data.targetParticipants !== undefined) {
      setClauses.push(`target_participants = $${paramIndex++}`);
      values.push(data.targetParticipants);
    }
    if (data.recruitmentCriteria !== undefined) {
      setClauses.push(`recruitment_criteria = $${paramIndex++}`);
      values.push(data.recruitmentCriteria);
    }
    // AI Prompt Configuration fields
    if (data.sourceSummaryPrompt !== undefined) {
      setClauses.push(`source_summary_prompt = $${paramIndex++}`);
      values.push(data.sourceSummaryPrompt);
    }
    if (data.projectSummaryPrompt !== undefined) {
      setClauses.push(`project_summary_prompt = $${paramIndex++}`);
      values.push(data.projectSummaryPrompt);
    }
    if (data.themeNamingPrompt !== undefined) {
      setClauses.push(`theme_naming_prompt = $${paramIndex++}`);
      values.push(data.themeNamingPrompt);
    }
    if (data.autoTaggingPrompt !== undefined) {
      setClauses.push(`auto_tagging_prompt = $${paramIndex++}`);
      values.push(data.autoTaggingPrompt);
    }
    if (data.autoTaggingEnabled !== undefined) {
      setClauses.push(`auto_tagging_enabled = $${paramIndex++}`);
      values.push(data.autoTaggingEnabled);
    }
    // Transcription Configuration fields
    if (data.transcriptionVocabulary !== undefined) {
      setClauses.push(`transcription_vocabulary = $${paramIndex++}`);
      values.push(data.transcriptionVocabulary);
    }
    if (data.transcriptionContext !== undefined) {
      setClauses.push(`transcription_context = $${paramIndex++}`);
      values.push(data.transcriptionContext);
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

export async function archiveProject(
  schemaName: string,
  projectId: string
): Promise<TenantProject | null> {
  return updateProject(schemaName, projectId, { archivedAt: new Date() });
}

export async function restoreProject(
  schemaName: string,
  projectId: string
): Promise<TenantProject | null> {
  return updateProject(schemaName, projectId, { archivedAt: null });
}
