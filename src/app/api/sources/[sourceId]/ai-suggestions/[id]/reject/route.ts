import { NextResponse } from 'next/server';
import { requireTenantAuth } from '@/lib/api/auth';
import { handleAPIError } from '@/lib/api/error-handler';
import { verifySourceAccessTenant } from '@/lib/db/tenant-queries';
import { rejectSuggestion } from '@/lib/db/tenant-queries/ai-suggestions';

/**
 * POST /api/sources/[sourceId]/ai-suggestions/[id]/reject
 *
 * Rejects a single AI suggestion without creating highlights.
 * Marks the suggestion as rejected in the database.
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

    // Reject suggestion
    const suggestion = await rejectSuggestion(schemaName, id);

    return NextResponse.json({ suggestion }, { status: 200 });
  } catch (error) {
    return handleAPIError(error, 'Failed to reject suggestion');
  }
}
