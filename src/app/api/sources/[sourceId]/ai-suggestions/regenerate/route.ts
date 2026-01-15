import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireTenantAuth } from '@/lib/api/auth';
import { handleAPIError } from '@/lib/api/error-handler';
import {
  verifySourceAccessTenant,
  getSourceById,
  updateProject,
  clearSourceAISuggestions,
} from '@/lib/db/tenant-queries';
import { withTenantSchema } from '@/lib/db/tenant';
import { autoHighlightingQueue } from '@/lib/queues';

const regenerateSchema = z.object({
  guideline: z.string().nullish(),
});

/**
 * POST /api/sources/[sourceId]/ai-suggestions/regenerate
 *
 * Regenerates AI auto-tagging suggestions for a source.
 * Optionally updates the project's auto-tagging guideline before regenerating.
 *
 * Body:
 * - guideline?: string - Optional new guideline to save
 *
 * Actions:
 * 1. Validates source access
 * 2. If guideline provided, updates project.autoTaggingPrompt
 * 3. Clears all existing AI suggestions for the source
 * 4. Sets source.auto_tagging_status to 'PENDING'
 * 5. Queues auto-highlighting job
 *
 * Returns: { success: true, status: 'PENDING', deletedCount: number }
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ sourceId: string }> }
) {
  try {
    const { schemaName, workspaceId } = await requireTenantAuth();
    const { sourceId } = await params;

    // Verify source access
    const sourceAccess = await verifySourceAccessTenant(schemaName, sourceId, workspaceId);
    if (!sourceAccess) {
      return NextResponse.json({ error: 'Source not found' }, { status: 404 });
    }

    // Get full source details to get projectId
    const source = await getSourceById(schemaName, sourceId);
    if (!source) {
      return NextResponse.json({ error: 'Source not found' }, { status: 404 });
    }

    // Parse request body
    const body = await request.json().catch(() => ({}));
    const parseResult = regenerateSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parseResult.error.issues },
        { status: 400 }
      );
    }

    const { guideline } = parseResult.data;
    const projectId = source.projectId;

    // If guideline provided, update project's autoTaggingPrompt
    if (guideline !== undefined) {
      await updateProject(schemaName, projectId, {
        autoTaggingPrompt: guideline,
      });
    }

    // Clear all existing AI suggestions for the source
    const { deletedCount } = await clearSourceAISuggestions(schemaName, sourceId);

    // Update source status to PENDING
    await withTenantSchema(schemaName, async (client) => {
      await client.query(
        'UPDATE sources SET auto_tagging_status = $1, updated_at = NOW() WHERE id = $2',
        ['PENDING', sourceId]
      );
    });

    // Queue auto-highlighting job
    await autoHighlightingQueue.add(
      `auto-highlighting-${sourceId}`,
      { sourceId, projectId, schemaName },
      { jobId: `auto-highlighting-${sourceId}-${Date.now()}` }
    );

    return NextResponse.json(
      {
        success: true,
        status: 'PENDING',
        deletedCount,
        message: `Cleared ${deletedCount} suggestions and queued regeneration`,
      },
      { status: 200 }
    );
  } catch (error) {
    return handleAPIError(error, 'Failed to regenerate AI suggestions');
  }
}
