import { NextResponse } from 'next/server';
import { requireTenantAuth } from '@/lib/api/auth';
import { handleAPIError } from '@/lib/api/error-handler';
import { verifyProjectAccessTenant, archiveProject } from '@/lib/db/tenant-queries';

/**
 * POST /api/projects/[projectId]/archive
 * Archive a project (soft delete)
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

    // Check if already archived
    if (existingProject.archivedAt) {
      return NextResponse.json({ error: 'Project is already archived' }, { status: 400 });
    }

    const project = await archiveProject(schemaName, projectId);

    return NextResponse.json({ project });
  } catch (error) {
    return handleAPIError(error, 'Failed to archive project');
  }
}
