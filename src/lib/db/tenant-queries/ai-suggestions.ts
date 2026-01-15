import { withTenantSchema } from '../tenant';
import { toCamelCase } from './utils';
import type { TenantAISuggestion, TenantSegment, TenantTag } from './types';

// ============================================
// AI SUGGESTION QUERIES
// ============================================

export interface AISuggestionInput {
  sourceId: string;
  segmentId: string;
  tagNames: string[];
  selectedText?: string | null;
  confidence?: number | null;
  aiNote?: string | null;
}

export interface AISuggestionWithRelations extends TenantAISuggestion {
  segment: TenantSegment;
  matchedTags: TenantTag[]; // Tags that exist in project
  unmatchedTagNames: string[]; // Tag names that don't exist
}

/**
 * Create multiple AI suggestions in a single batch (optimized for worker)
 */
export async function createAISuggestionsBatch(
  schemaName: string,
  suggestions: AISuggestionInput[]
): Promise<TenantAISuggestion[]> {
  if (suggestions.length === 0) {
    return [];
  }

  return withTenantSchema(schemaName, async (client) => {
    // Build bulk INSERT with VALUES for each suggestion
    const values: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    for (const suggestion of suggestions) {
      values.push(
        `($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5})`
      );
      params.push(
        suggestion.sourceId,
        suggestion.segmentId,
        suggestion.tagNames,
        suggestion.selectedText || null,
        suggestion.confidence || null,
        suggestion.aiNote || null
      );
      paramIndex += 6;
    }

    const query = `
      INSERT INTO ai_highlight_suggestions
        (source_id, segment_id, tag_names, selected_text, confidence, ai_note)
      VALUES ${values.join(', ')}
      RETURNING *
    `;

    const result = await client.query(query, params);
    return result.rows.map((row) => toCamelCase(row)) as TenantAISuggestion[];
  });
}

/**
 * Get all AI suggestions for a source with related data
 * Returns both pending and approved suggestions for statistics display
 */
export async function getSourceAISuggestions(
  schemaName: string,
  sourceId: string
): Promise<AISuggestionWithRelations[]> {
  return withTenantSchema(schemaName, async (client) => {
    const result = await client.query(
      `
      SELECT
        s.*,
        seg.id as segment_id,
        seg.content as segment_content,
        seg.start_time as segment_start_time,
        seg.end_time as segment_end_time,
        seg.speaker_id as segment_speaker_id
      FROM ai_highlight_suggestions s
      JOIN transcript_segments seg ON seg.id = s.segment_id
      WHERE s.source_id = $1 AND s.status IN ('pending', 'approved')
      ORDER BY seg.start_time ASC
      `,
      [sourceId]
    );

    // Get all project tags for matching
    const segmentResult = await client.query(`SELECT project_id FROM sources WHERE id = $1`, [
      sourceId,
    ]);

    if (segmentResult.rows.length === 0) {
      return [];
    }

    const projectId = segmentResult.rows[0].project_id;
    const tagsResult = await client.query(`SELECT * FROM tags WHERE project_id = $1`, [projectId]);

    const projectTags = tagsResult.rows.map((row) => toCamelCase(row) as TenantTag);

    // Build response with matched/unmatched tags
    return result.rows.map((row) => {
      const suggestion = toCamelCase(row) as TenantAISuggestion;
      const segment: TenantSegment = {
        id: row.segment_id,
        sourceId,
        content: row.segment_content,
        startTime: row.segment_start_time,
        endTime: row.segment_end_time,
        speakerId: row.segment_speaker_id,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const tagNamesLower = suggestion.tagNames.map((name) => name.toLowerCase());
      const matchedTags = projectTags.filter((tag) =>
        tagNamesLower.includes(tag.name.toLowerCase())
      );
      const matchedTagNames = matchedTags.map((tag) => tag.name.toLowerCase());
      const unmatchedTagNames = suggestion.tagNames.filter(
        (name) => !matchedTagNames.includes(name.toLowerCase())
      );

      return {
        ...suggestion,
        segment,
        matchedTags,
        unmatchedTagNames,
      };
    });
  });
}

/**
 * Approve a single suggestion and create highlights (one per matched tag)
 */
export async function approveSuggestion(
  schemaName: string,
  suggestionId: string
): Promise<{ suggestion: TenantAISuggestion; highlightIds: string[] }> {
  return withTenantSchema(schemaName, async (client) => {
    // Get suggestion details
    const suggestionResult = await client.query(
      `SELECT * FROM ai_highlight_suggestions WHERE id = $1`,
      [suggestionId]
    );

    if (suggestionResult.rows.length === 0) {
      throw new Error(`Suggestion ${suggestionId} not found`);
    }

    const suggestion = toCamelCase(suggestionResult.rows[0]) as TenantAISuggestion;

    // Get project tags for matching
    const sourceResult = await client.query(`SELECT project_id FROM sources WHERE id = $1`, [
      suggestion.sourceId,
    ]);
    const projectId = sourceResult.rows[0].project_id;

    const tagsResult = await client.query(`SELECT * FROM tags WHERE project_id = $1`, [projectId]);

    const projectTags = tagsResult.rows.map((row) => toCamelCase(row) as TenantTag);

    // Match tag names (case-insensitive)
    const tagNamesLower = suggestion.tagNames.map((name) => name.toLowerCase());
    const matchedTags = projectTags.filter((tag) => tagNamesLower.includes(tag.name.toLowerCase()));

    if (matchedTags.length === 0) {
      throw new Error(`No matching tags found for suggestion ${suggestionId}`);
    }

    // Create highlights (one per matched tag)
    const highlightIds: string[] = [];
    for (const tag of matchedTags) {
      const highlightResult = await client.query(
        `
        INSERT INTO highlights (segment_id, tag_id, note, selected_text)
        VALUES ($1, $2, $3, $4)
        RETURNING id
        `,
        [suggestion.segmentId, tag.id, suggestion.aiNote, suggestion.selectedText]
      );
      highlightIds.push(highlightResult.rows[0].id);
    }

    // Mark suggestion as approved
    await client.query(
      `UPDATE ai_highlight_suggestions SET status = 'approved', updated_at = NOW() WHERE id = $1`,
      [suggestionId]
    );

    return {
      suggestion: { ...suggestion, status: 'approved' },
      highlightIds,
    };
  });
}

/**
 * Reject a single suggestion
 */
export async function rejectSuggestion(
  schemaName: string,
  suggestionId: string
): Promise<TenantAISuggestion> {
  return withTenantSchema(schemaName, async (client) => {
    const result = await client.query(
      `UPDATE ai_highlight_suggestions
       SET status = 'rejected', updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [suggestionId]
    );

    if (result.rows.length === 0) {
      throw new Error(`Suggestion ${suggestionId} not found`);
    }

    return toCamelCase(result.rows[0]) as TenantAISuggestion;
  });
}

/**
 * Update AI suggestion fields (note, selectedText, tagNames)
 * Used for editing suggestions before approval
 */
export async function updateAISuggestion(
  schemaName: string,
  suggestionId: string,
  data: Partial<{
    aiNote: string | null;
    selectedText: string | null;
    tagNames: string[];
  }>
): Promise<TenantAISuggestion | null> {
  return withTenantSchema(schemaName, async (client) => {
    // Build dynamic UPDATE with only provided fields
    const updates: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (data.aiNote !== undefined) {
      updates.push(`ai_note = $${paramIndex}`);
      params.push(data.aiNote);
      paramIndex++;
    }

    if (data.selectedText !== undefined) {
      updates.push(`selected_text = $${paramIndex}`);
      params.push(data.selectedText);
      paramIndex++;
    }

    if (data.tagNames !== undefined) {
      updates.push(`tag_names = $${paramIndex}`);
      params.push(data.tagNames);
      paramIndex++;
    }

    // Always update updated_at
    updates.push(`updated_at = NOW()`);

    if (updates.length === 1) {
      // Only updated_at, nothing to update
      return null;
    }

    params.push(suggestionId);

    const query = `
      UPDATE ai_highlight_suggestions
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await client.query(query, params);

    if (result.rows.length === 0) {
      return null;
    }

    return toCamelCase(result.rows[0]) as TenantAISuggestion;
  });
}

/**
 * Approve all pending suggestions for a source
 */
export async function approveAllSuggestions(
  schemaName: string,
  sourceId: string
): Promise<{ approvedCount: number; highlightCount: number }> {
  return withTenantSchema(schemaName, async (client) => {
    // Get all pending suggestions
    const suggestions = await getSourceAISuggestions(schemaName, sourceId);

    let highlightCount = 0;
    for (const suggestion of suggestions) {
      if (suggestion.matchedTags.length > 0) {
        const result = await approveSuggestion(schemaName, suggestion.id);
        highlightCount += result.highlightIds.length;
      } else {
        // Reject suggestions with no matched tags
        await rejectSuggestion(schemaName, suggestion.id);
      }
    }

    // Update source status
    await client.query(
      `UPDATE sources SET auto_tagging_status = 'COMPLETED', updated_at = NOW() WHERE id = $1`,
      [sourceId]
    );

    return {
      approvedCount: suggestions.filter((s) => s.matchedTags.length > 0).length,
      highlightCount,
    };
  });
}

/**
 * Reject all pending suggestions for a source
 */
export async function rejectAllSuggestions(
  schemaName: string,
  sourceId: string
): Promise<{ rejectedCount: number }> {
  return withTenantSchema(schemaName, async (client) => {
    const result = await client.query(
      `UPDATE ai_highlight_suggestions
       SET status = 'rejected', updated_at = NOW()
       WHERE source_id = $1 AND status = 'pending'
       RETURNING id`,
      [sourceId]
    );

    // Update source status
    await client.query(
      `UPDATE sources SET auto_tagging_status = 'COMPLETED', updated_at = NOW() WHERE id = $1`,
      [sourceId]
    );

    return { rejectedCount: result.rows.length };
  });
}

/**
 * Get count of pending suggestions for a source
 */
export async function getPendingSuggestionsCount(
  schemaName: string,
  sourceId: string
): Promise<number> {
  return withTenantSchema(schemaName, async (client) => {
    const result = await client.query(
      `SELECT COUNT(*) as count FROM ai_highlight_suggestions WHERE source_id = $1 AND status = 'pending'`,
      [sourceId]
    );
    return parseInt(result.rows[0].count, 10);
  });
}
