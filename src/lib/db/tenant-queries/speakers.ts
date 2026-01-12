import { withTenantSchema } from '../tenant';
import type { TenantSpeakerName } from './types';
import { toCamelCase, rowsToCamelCase } from './utils';

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
