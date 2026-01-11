import { NextResponse } from 'next/server';
import { idSchema } from '@/lib/validations';
import { requireTenantAuth } from '@/lib/api/auth';
import { handleAPIError } from '@/lib/api/error-handler';
import { verifySourceAccessTenant, getSourceWithDetails } from '@/lib/db/tenant-queries';

/**
 * GET /api/sources/[sourceId]
 *
 * Fetches a source with all its transcript segments and project tags.
 * Used by the Analysis Canvas to render the video player and transcript.
 */
export async function GET(request: Request, { params }: { params: Promise<{ sourceId: string }> }) {
  try {
    const { schemaName, workspaceId } = await requireTenantAuth();
    const { sourceId } = await params;

    // Validate sourceId
    const parseResult = idSchema.safeParse(sourceId);
    if (!parseResult.success) {
      return NextResponse.json({ error: 'Invalid source ID' }, { status: 400 });
    }

    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace assigned' }, { status: 403 });
    }

    // Verify access via tenant schema
    const accessCheck = await verifySourceAccessTenant(schemaName, sourceId, workspaceId);
    if (!accessCheck) {
      return NextResponse.json({ error: 'Source not found' }, { status: 404 });
    }

    // Fetch source with full details from tenant schema
    const source = await getSourceWithDetails(schemaName, sourceId);

    return NextResponse.json(source);
  } catch (error) {
    return handleAPIError(error, 'Failed to fetch source');
  }
}
