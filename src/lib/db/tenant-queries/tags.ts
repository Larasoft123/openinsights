import { withTenantSchema } from '../tenant';
import type { TenantTag } from './types';
import { toCamelCase } from './utils';

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
