import { withTenantSchema } from '../tenant';
import type { TenantWorkspace } from './types';
import { toCamelCase } from './utils';

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
