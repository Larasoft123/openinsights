import { withTenantSchema } from '../tenant';
import type { TenantProject } from './types';
import { toCamelCase } from './utils';

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
