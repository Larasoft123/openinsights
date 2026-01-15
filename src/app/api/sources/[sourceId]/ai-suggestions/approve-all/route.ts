import { NextResponse } from 'next/server';
import { requireTenantAuth } from '@/lib/api/auth';
import { handleAPIError } from '@/lib/api/error-handler';
import { verifySourceAccessTenant } from '@/lib/db/tenant-queries';
import { approveAllSuggestions } from '@/lib/db/tenant-queries/ai-suggestions';

/**
 * POST /api/sources/[sourceId]/ai-suggestions/approve-all
 *
 * Approves all pending AI suggestions for a source and creates highlights.
 * Updates source status to COMPLETED when done.
 * Returns count of approved suggestions and created highlights.
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

    // Approve all pending suggestions
    const result = await approveAllSuggestions(schemaName, sourceId);

    return NextResponse.json(
      {
        approvedCount: result.approvedCount,
        highlightCount: result.highlightCount,
        message: `Approved ${result.approvedCount} suggestions and created ${result.highlightCount} highlights`,
      },
      { status: 200 }
    );
  } catch (error) {
    return handleAPIError(error, 'Failed to approve all suggestions');
  }
}
