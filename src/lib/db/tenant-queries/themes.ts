import { withTenantSchema } from '../tenant';
import type { TenantTheme } from './types';
import { toCamelCase } from './utils';

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
