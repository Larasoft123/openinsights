import { withTenantSchema } from '../tenant';
import { toCamelCase } from './utils';

// ============================================
// TYPES
// ============================================

export interface TenantWorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  role: 'owner' | 'editor' | 'viewer';
  createdAt: Date;
}

export interface TenantWorkspaceWithMembers {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
  memberCount: number;
  projectCount: number;
  userRole: 'owner' | 'editor' | 'viewer';
}

// ============================================
// WORKSPACE QUERIES
// ============================================

/**
 * Get all workspaces the user is a member of
 */
export async function getWorkspacesForUser(
  schemaName: string,
  userId: string
): Promise<TenantWorkspaceWithMembers[]> {
  return withTenantSchema(schemaName, async (client) => {
    const result = await client.query(
      `SELECT
        w.id,
        w.name,
        w.slug,
        w.created_at,
        w.updated_at,
        wm.role as user_role,
        (SELECT COUNT(*) FROM workspace_members WHERE workspace_id = w.id) as member_count,
        (SELECT COUNT(*) FROM projects WHERE workspace_id = w.id AND archived_at IS NULL) as project_count
      FROM workspaces w
      JOIN workspace_members wm ON wm.workspace_id = w.id
      WHERE wm.user_id = $1
      ORDER BY w.name`,
      [userId]
    );
    return result.rows.map((row) => ({
      ...toCamelCase(row),
      memberCount: parseInt(row.member_count, 10),
      projectCount: parseInt(row.project_count, 10),
    })) as TenantWorkspaceWithMembers[];
  });
}

/**
 * Create a new workspace and add the creator as owner
 */
export async function createWorkspace(
  schemaName: string,
  name: string,
  slug: string,
  creatorUserId: string
): Promise<TenantWorkspaceWithMembers> {
  return withTenantSchema(schemaName, async (client) => {
    // Create workspace
    const workspaceResult = await client.query(
      `INSERT INTO workspaces (name, slug) VALUES ($1, $2) RETURNING *`,
      [name, slug]
    );
    const workspace = workspaceResult.rows[0];

    // Add creator as owner
    await client.query(
      `INSERT INTO workspace_members (workspace_id, user_id, role) VALUES ($1, $2, 'owner')`,
      [workspace.id, creatorUserId]
    );

    return {
      ...toCamelCase(workspace),
      memberCount: 1,
      projectCount: 0,
      userRole: 'owner' as const,
    } as TenantWorkspaceWithMembers;
  });
}

/**
 * Update a workspace
 */
export async function updateWorkspace(
  schemaName: string,
  workspaceId: string,
  data: { name?: string; slug?: string }
): Promise<TenantWorkspaceWithMembers | null> {
  return withTenantSchema(schemaName, async (client) => {
    const updates: string[] = [];
    const values: (string | number)[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(data.name);
    }
    if (data.slug !== undefined) {
      updates.push(`slug = $${paramIndex++}`);
      values.push(data.slug);
    }

    if (updates.length === 0) {
      return null;
    }

    values.push(workspaceId);

    const result = await client.query(
      `UPDATE workspaces SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    if (result.rows.length === 0) return null;

    const workspace = result.rows[0];

    // Get counts
    const countsResult = await client.query(
      `SELECT
        (SELECT COUNT(*) FROM workspace_members WHERE workspace_id = $1) as member_count,
        (SELECT COUNT(*) FROM projects WHERE workspace_id = $1 AND archived_at IS NULL) as project_count`,
      [workspaceId]
    );

    return {
      ...toCamelCase(workspace),
      memberCount: parseInt(countsResult.rows[0].member_count, 10),
      projectCount: parseInt(countsResult.rows[0].project_count, 10),
      userRole: 'owner' as const, // Only owners can update
    } as TenantWorkspaceWithMembers;
  });
}

/**
 * Delete a workspace
 */
export async function deleteWorkspace(schemaName: string, workspaceId: string): Promise<boolean> {
  return withTenantSchema(schemaName, async (client) => {
    const result = await client.query(`DELETE FROM workspaces WHERE id = $1`, [workspaceId]);
    return (result.rowCount ?? 0) > 0;
  });
}

/**
 * Check if user has access to workspace and get their role
 */
export async function getUserWorkspaceRole(
  schemaName: string,
  workspaceId: string,
  userId: string
): Promise<'owner' | 'editor' | 'viewer' | null> {
  return withTenantSchema(schemaName, async (client) => {
    const result = await client.query(
      `SELECT role FROM workspace_members WHERE workspace_id = $1 AND user_id = $2`,
      [workspaceId, userId]
    );
    if (result.rows.length === 0) return null;
    return result.rows[0].role as 'owner' | 'editor' | 'viewer';
  });
}

// ============================================
// WORKSPACE MEMBER QUERIES
// ============================================

export interface WorkspaceMemberWithUser {
  id: string;
  workspaceId: string;
  userId: string;
  role: 'owner' | 'editor' | 'viewer';
  createdAt: Date;
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
}

/**
 * Get all members of a workspace
 */
export async function getWorkspaceMembers(
  schemaName: string,
  workspaceId: string
): Promise<WorkspaceMemberWithUser[]> {
  return withTenantSchema(schemaName, async (client) => {
    const result = await client.query(
      `SELECT
        wm.id,
        wm.workspace_id,
        wm.user_id,
        wm.role,
        wm.created_at,
        u.id as u_id,
        u.name as u_name,
        u.email as u_email,
        u.image as u_image
      FROM workspace_members wm
      JOIN public.users u ON u.id = wm.user_id
      WHERE wm.workspace_id = $1
      ORDER BY
        CASE wm.role
          WHEN 'owner' THEN 0
          WHEN 'editor' THEN 1
          ELSE 2
        END,
        wm.created_at`,
      [workspaceId]
    );

    return result.rows.map((row) => ({
      id: row.id,
      workspaceId: row.workspace_id,
      userId: row.user_id,
      role: row.role as 'owner' | 'editor' | 'viewer',
      createdAt: row.created_at,
      user: {
        id: row.u_id,
        name: row.u_name,
        email: row.u_email,
        image: row.u_image,
      },
    }));
  });
}

/**
 * Add a member to a workspace
 */
export async function addWorkspaceMember(
  schemaName: string,
  workspaceId: string,
  userId: string,
  role: 'editor' | 'viewer'
): Promise<TenantWorkspaceMember> {
  return withTenantSchema(schemaName, async (client) => {
    const result = await client.query(
      `INSERT INTO workspace_members (workspace_id, user_id, role)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [workspaceId, userId, role]
    );
    return toCamelCase(result.rows[0]) as TenantWorkspaceMember;
  });
}

/**
 * Update a member's role in a workspace
 */
export async function updateWorkspaceMemberRole(
  schemaName: string,
  memberId: string,
  newRole: 'owner' | 'editor' | 'viewer'
): Promise<TenantWorkspaceMember | null> {
  return withTenantSchema(schemaName, async (client) => {
    const result = await client.query(
      `UPDATE workspace_members SET role = $1 WHERE id = $2 RETURNING *`,
      [newRole, memberId]
    );
    if (result.rows.length === 0) return null;
    return toCamelCase(result.rows[0]) as TenantWorkspaceMember;
  });
}

/**
 * Remove a member from a workspace
 */
export async function removeWorkspaceMember(
  schemaName: string,
  memberId: string
): Promise<boolean> {
  return withTenantSchema(schemaName, async (client) => {
    const result = await client.query(`DELETE FROM workspace_members WHERE id = $1`, [memberId]);
    return (result.rowCount ?? 0) > 0;
  });
}

/**
 * Count owners in a workspace
 */
export async function countWorkspaceOwners(
  schemaName: string,
  workspaceId: string
): Promise<number> {
  return withTenantSchema(schemaName, async (client) => {
    const result = await client.query(
      `SELECT COUNT(*) FROM workspace_members WHERE workspace_id = $1 AND role = 'owner'`,
      [workspaceId]
    );
    return parseInt(result.rows[0].count, 10);
  });
}

/**
 * Get a specific workspace member by ID
 */
export async function getWorkspaceMemberById(
  schemaName: string,
  memberId: string
): Promise<TenantWorkspaceMember | null> {
  return withTenantSchema(schemaName, async (client) => {
    const result = await client.query(`SELECT * FROM workspace_members WHERE id = $1`, [memberId]);
    if (result.rows.length === 0) return null;
    return toCamelCase(result.rows[0]) as TenantWorkspaceMember;
  });
}
