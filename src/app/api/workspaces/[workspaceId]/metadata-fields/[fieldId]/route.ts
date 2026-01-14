import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { updateMetadataFieldSchema } from '@/lib/validations';
import { requireTenantAuth } from '@/lib/api/auth';
import { handleAPIError } from '@/lib/api/error-handler';
import { getUserWorkspaceRole } from '@/lib/db/tenant-queries/workspace-members';
import {
  verifyMetadataFieldAccess,
  getMetadataFieldByName,
  updateMetadataField,
  deleteMetadataField,
} from '@/lib/db/tenant-queries';

const log = logger.child({ route: 'workspace-metadata-fields/[fieldId]' });

interface RouteParams {
  params: Promise<{ workspaceId: string; fieldId: string }>;
}

/**
 * PATCH /api/workspaces/[workspaceId]/metadata-fields/[fieldId]
 * Update a metadata field
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { schemaName, userId } = await requireTenantAuth();
    const { workspaceId, fieldId } = await params;

    // Verify workspace access (require editor or owner)
    const userRole = await getUserWorkspaceRole(schemaName, workspaceId, userId);
    if (!userRole) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }
    if (userRole === 'viewer') {
      return NextResponse.json(
        { error: 'You do not have permission to update metadata fields' },
        { status: 403 }
      );
    }

    // Verify field access
    const existingField = await verifyMetadataFieldAccess(
      schemaName,
      fieldId,
      'PROJECT',
      workspaceId
    );
    if (!existingField) {
      return NextResponse.json({ error: 'Field not found' }, { status: 404 });
    }

    const body = await request.json();

    // Validate request body
    const parseResult = updateMetadataFieldSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parseResult.error.issues },
        { status: 400 }
      );
    }

    // Check for duplicate name if name is being changed
    if (parseResult.data.name && parseResult.data.name !== existingField.name) {
      const duplicateField = await getMetadataFieldByName(
        schemaName,
        'PROJECT',
        workspaceId,
        parseResult.data.name
      );
      if (duplicateField) {
        return NextResponse.json(
          { error: 'A field with this name already exists in this workspace' },
          { status: 409 }
        );
      }
    }

    const field = await updateMetadataField(schemaName, fieldId, parseResult.data);

    log.info({ workspaceId, fieldId }, 'Metadata field updated');

    return NextResponse.json({ field });
  } catch (error) {
    return handleAPIError(error, 'Failed to update metadata field');
  }
}

/**
 * DELETE /api/workspaces/[workspaceId]/metadata-fields/[fieldId]
 * Delete a metadata field (cascades to values)
 */
export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const { schemaName, userId } = await requireTenantAuth();
    const { workspaceId, fieldId } = await params;

    // Verify workspace access (require editor or owner)
    const userRole = await getUserWorkspaceRole(schemaName, workspaceId, userId);
    if (!userRole) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }
    if (userRole === 'viewer') {
      return NextResponse.json(
        { error: 'You do not have permission to delete metadata fields' },
        { status: 403 }
      );
    }

    // Verify field access
    const existingField = await verifyMetadataFieldAccess(
      schemaName,
      fieldId,
      'PROJECT',
      workspaceId
    );
    if (!existingField) {
      return NextResponse.json({ error: 'Field not found' }, { status: 404 });
    }

    await deleteMetadataField(schemaName, fieldId);

    log.info({ workspaceId, fieldId }, 'Metadata field deleted');

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleAPIError(error, 'Failed to delete metadata field');
  }
}
