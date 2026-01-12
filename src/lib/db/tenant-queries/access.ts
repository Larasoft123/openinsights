import { withTenantSchema } from '../tenant';
import type {
  TenantProject,
  TenantSource,
  TenantSegment,
  TenantTag,
  TenantTheme,
  TenantHighlight,
} from './types';
import { toCamelCase } from './utils';

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
