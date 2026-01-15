import { NextResponse } from 'next/server';
import { requireTenantAuth } from '@/lib/api/auth';
import { handleAPIError } from '@/lib/api/error-handler';
import { verifySourceAccessTenant } from '@/lib/db/tenant-queries';
import { rejectAllSuggestions } from '@/lib/db/tenant-queries/ai-suggestions';

/**
 * POST /api/sources/[sourceId]/ai-suggestions/reject-all
 *
 * Rejects all pending AI suggestions for a source without creating highlights.
 * Updates source status to COMPLETED when done.
 * Returns count of rejected suggestions.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ sourceId: string }> }
) {
  try {
    const { schemaName, workspaceId } = await requireTenantAuth();
    const { sourceId } = await params;

    // Verify source access
    const source = await verifySourceAccessTenant(schemaName, sourceId, workspaceId);
    if (!source) {
      return NextResponse.json({ error: 'Source not found' }, { status: 404 });
    }

    // Reject all pending suggestions
    const result = await rejectAllSuggestions(schemaName, sourceId);

    return NextResponse.json(
      {
        rejectedCount: result.rejectedCount,
        message: `Rejected ${result.rejectedCount} suggestions`,
      },
      { status: 200 }
    );
  } catch (error) {
    return handleAPIError(error, 'Failed to reject all suggestions');
  }
}
