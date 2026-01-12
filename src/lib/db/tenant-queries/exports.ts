import { withTenantSchema } from '../tenant';

// ============================================
// EXPORT QUERIES
// ============================================

export interface ProjectExportData {
  id: string;
  name: string;
  createdAt: Date;
  workspace: {
    name: string;
  };
  themes: Array<{
    id: string;
    name: string;
    description: string | null;
    color: string;
    highlights: Array<{
      highlight: {
        id: string;
        note: string | null;
        tag: {
          name: string;
          color: string;
        };
        segment: {
          content: string;
          startTime: number;
          endTime: number;
          source: {
            title: string;
          };
        };
      };
    }>;
  }>;
}

/**
 * Get project data for export with all nested relations.
 * Used by the export route to generate Markdown/PDF.
 */
export async function getProjectForExport(
  schemaName: string,
  projectId: string,
  themeId?: string | null
): Promise<ProjectExportData | null> {
  return withTenantSchema(schemaName, async (client) => {
    // Get project with workspace
    const projectResult = await client.query(
      `SELECT p.*, w.name as workspace_name
       FROM projects p
       JOIN workspaces w ON w.id = p.workspace_id
       WHERE p.id = $1`,
      [projectId]
    );
    if (projectResult.rows.length === 0) return null;
    const projectRow = projectResult.rows[0];

    // Get themes (optionally filtered by themeId)
    const themesQuery = themeId
      ? `SELECT * FROM themes WHERE project_id = $1 AND id = $2 ORDER BY name ASC`
      : `SELECT * FROM themes WHERE project_id = $1 ORDER BY name ASC`;
    const themesParams = themeId ? [projectId, themeId] : [projectId];
    const themesResult = await client.query(themesQuery, themesParams);

    // Build theme data with highlights
    const themes: ProjectExportData['themes'] = [];

    for (const themeRow of themesResult.rows) {
      // Get highlights for this theme with all nested data
      const highlightsResult = await client.query(
        `SELECT ht.highlight_id, h.note, h.selected_text,
                t.name as tag_name, t.color as tag_color,
                ts.content as segment_content, ts.start_time, ts.end_time,
                s.title as source_title
         FROM highlight_themes ht
         JOIN highlights h ON h.id = ht.highlight_id
         JOIN tags t ON t.id = h.tag_id
         JOIN transcript_segments ts ON ts.id = h.segment_id
         JOIN sources s ON s.id = ts.source_id
         WHERE ht.theme_id = $1
         ORDER BY ts.start_time ASC`,
        [themeRow.id]
      );

      const highlights = highlightsResult.rows.map((row) => ({
        highlight: {
          id: row.highlight_id,
          note: row.note,
          tag: {
            name: row.tag_name,
            color: row.tag_color,
          },
          segment: {
            content: row.segment_content,
            startTime: row.start_time,
            endTime: row.end_time,
            source: {
              title: row.source_title,
            },
          },
        },
      }));

      themes.push({
        id: themeRow.id,
        name: themeRow.name,
        description: themeRow.description,
        color: themeRow.color,
        highlights,
      });
    }

    return {
      id: projectRow.id,
      name: projectRow.name,
      createdAt: projectRow.created_at,
      workspace: {
        name: projectRow.workspace_name,
      },
      themes,
    };
  });
}
