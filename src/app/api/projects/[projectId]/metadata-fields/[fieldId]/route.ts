import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { updateMetadataFieldSchema } from '@/lib/validations';
import { requireTenantAuth } from '@/lib/api/auth';
import { handleAPIError } from '@/lib/api/error-handler';
import {
  verifyProjectAccessTenant,
  verifyMetadataFieldAccess,
  getMetadataFieldByName,
  updateMetadataField,
  deleteMetadataField,
} from '@/lib/db/tenant-queries';

const log = logger.child({ route: 'metadata-fields/[fieldId]' });

interface RouteParams {
  params: Promise<{ projectId: string; fieldId: string }>;
}

/**
 * PATCH /api/projects/[projectId]/metadata-fields/[fieldId]
 * Update a metadata field
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { schemaName, workspaceId } = await requireTenantAuth();
    const { projectId, fieldId } = await params;

    // Verify project access
    const project = await verifyProjectAccessTenant(schemaName, projectId, workspaceId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Verify field access
    const existingField = await verifyMetadataFieldAccess(schemaName, fieldId, 'SOURCE', projectId);
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
        'SOURCE',
        projectId,
        parseResult.data.name
      );
      if (duplicateField) {
        return NextResponse.json(
          { error: 'A field with this name already exists in this project' },
          { status: 409 }
        );
      }
    }

    const field = await updateMetadataField(schemaName, fieldId, parseResult.data);

    log.info({ projectId, fieldId }, 'Metadata field updated');

    return NextResponse.json({ field });
  } catch (error) {
    return handleAPIError(error, 'Failed to update metadata field');
  }
}

/**
 * DELETE /api/projects/[projectId]/metadata-fields/[fieldId]
 * Delete a metadata field (cascades to values)
 */
export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const { schemaName, workspaceId } = await requireTenantAuth();
    const { projectId, fieldId } = await params;

    // Verify project access
    const project = await verifyProjectAccessTenant(schemaName, projectId, workspaceId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Verify field access
    const existingField = await verifyMetadataFieldAccess(schemaName, fieldId, 'SOURCE', projectId);
    if (!existingField) {
      return NextResponse.json({ error: 'Field not found' }, { status: 404 });
    }

    await deleteMetadataField(schemaName, fieldId);

    log.info({ projectId, fieldId }, 'Metadata field deleted');

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleAPIError(error, 'Failed to delete metadata field');
  }
}
