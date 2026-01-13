import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { reorderMetadataFieldsSchema } from '@/lib/validations';
import { requireTenantAuth } from '@/lib/api/auth';
import { handleAPIError } from '@/lib/api/error-handler';
import { getUserWorkspaceRole } from '@/lib/db/tenant-queries/workspace-members';
import { listMetadataFields, reorderMetadataFields } from '@/lib/db/tenant-queries';

const log = logger.child({ route: 'workspace-metadata-fields/reorder' });

interface RouteParams {
  params: Promise<{ workspaceId: string }>;
}

/**
 * PUT /api/workspaces/[workspaceId]/metadata-fields/reorder
 * Reorder metadata fields
 *
 * Body: { fieldIds: string[] }
 */
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { schemaName, userId } = await requireTenantAuth();
    const { workspaceId } = await params;

    // Verify workspace access (require editor or owner)
    const userRole = await getUserWorkspaceRole(schemaName, workspaceId, userId);
    if (!userRole) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }
    if (userRole === 'viewer') {
      return NextResponse.json(
        { error: 'You do not have permission to reorder metadata fields' },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Validate request body
    const result = reorderMetadataFieldsSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: result.error.issues },
        { status: 400 }
      );
    }

    const { fieldIds } = result.data;

    // Verify all field IDs belong to this workspace
    const existingFields = await listMetadataFields(schemaName, 'PROJECT', workspaceId);
    const existingFieldIds = new Set(existingFields.map((f) => f.id));

    for (const fieldId of fieldIds) {
      if (!existingFieldIds.has(fieldId)) {
        return NextResponse.json(
          { error: `Field ${fieldId} not found in this workspace` },
          { status: 400 }
        );
      }
    }

    await reorderMetadataFields(schemaName, fieldIds);

    // Return updated fields
    const fields = await listMetadataFields(schemaName, 'PROJECT', workspaceId);

    log.info({ workspaceId, fieldCount: fieldIds.length }, 'Metadata fields reordered');

    return NextResponse.json({ fields });
  } catch (error) {
    return handleAPIError(error, 'Failed to reorder metadata fields');
  }
}
