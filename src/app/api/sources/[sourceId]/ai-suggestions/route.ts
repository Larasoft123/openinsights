import { NextResponse } from 'next/server';
import { requireTenantAuth } from '@/lib/api/auth';
import { handleAPIError } from '@/lib/api/error-handler';
import { verifySourceAccessTenant } from '@/lib/db/tenant-queries';
import { getSourceAISuggestions } from '@/lib/db/tenant-queries/ai-suggestions';

/**
 * GET /api/sources/[sourceId]/ai-suggestions
 *
 * Retrieves all pending AI highlight suggestions for a source.
 * Used by the AI Suggestions Preview component in Analysis Canvas.
 */
export async function GET(request: Request, { params }: { params: Promise<{ sourceId: string }> }) {
  try {
    const { schemaName, workspaceId } = await requireTenantAuth();
    const { sourceId } = await params;

    // Verify source access
    const source = await verifySourceAccessTenant(schemaName, sourceId, workspaceId);
    if (!source) {
      return NextResponse.json({ error: 'Source not found' }, { status: 404 });
    }

    // Get all pending suggestions with related data
    const suggestions = await getSourceAISuggestions(schemaName, sourceId);

    return NextResponse.json({ suggestions }, { status: 200 });
  } catch (error) {
    return handleAPIError(error, 'Failed to fetch AI suggestions');
  }
}
