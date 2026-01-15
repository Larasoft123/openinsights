import { NextResponse } from 'next/server';
import { requireTenantAuth } from '@/lib/api/auth';
import { handleAPIError } from '@/lib/api/error-handler';
import { verifyProjectAccessTenant, restoreProject } from '@/lib/db/tenant-queries';

/**
 * POST /api/projects/[projectId]/restore
 * Restore an archived project
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { schemaName, workspaceId } = await requireTenantAuth();
    const { projectId } = await params;

    // Verify project access
    const existingProject = await verifyProjectAccessTenant(schemaName, projectId, workspaceId);
    if (!existingProject) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Check if not archived
    if (!existingProject.archivedAt) {
      return NextResponse.json({ error: 'Project is not archived' }, { status: 400 });
    }

    const project = await restoreProject(schemaName, projectId);

    return NextResponse.json({ project });
  } catch (error) {
    return handleAPIError(error, 'Failed to restore project');
  }
}
