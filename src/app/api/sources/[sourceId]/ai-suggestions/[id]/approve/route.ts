import { NextResponse } from 'next/server';
import { requireTenantAuth } from '@/lib/api/auth';
import { handleAPIError } from '@/lib/api/error-handler';
import { verifySourceAccessTenant } from '@/lib/db/tenant-queries';
import { approveSuggestion } from '@/lib/db/tenant-queries/ai-suggestions';

/**
 * POST /api/sources/[sourceId]/ai-suggestions/[id]/approve
 *
 * Approves a single AI suggestion and creates highlights.
 * Creates one highlight per matched tag in the suggestion.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ sourceId: string; id: string }> }
) {
  try {
    const { schemaName, workspaceId } = await requireTenantAuth();
    const { sourceId, id } = await params;

    // Verify source access
    const source = await verifySourceAccessTenant(schemaName, sourceId, workspaceId);
    if (!source) {
      return NextResponse.json({ error: 'Source not found' }, { status: 404 });
    }

    // Approve suggestion and create highlights
    const result = await approveSuggestion(schemaName, id);

    return NextResponse.json(
      {
        suggestion: result.suggestion,
        highlightIds: result.highlightIds,
        highlightCount: result.highlightIds.length,
      },
      { status: 200 }
    );
  } catch (error) {
    return handleAPIError(error, 'Failed to approve suggestion');
  }
}
