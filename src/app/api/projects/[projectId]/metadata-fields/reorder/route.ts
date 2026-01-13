import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { reorderMetadataFieldsSchema } from '@/lib/validations';
import { requireTenantAuth } from '@/lib/api/auth';
import { handleAPIError } from '@/lib/api/error-handler';
import {
  verifyProjectAccessTenant,
  listMetadataFields,
  reorderMetadataFields,
} from '@/lib/db/tenant-queries';

const log = logger.child({ route: 'metadata-fields/reorder' });

interface RouteParams {
  params: Promise<{ projectId: string }>;
}

/**
 * PUT /api/projects/[projectId]/metadata-fields/reorder
 * Reorder metadata fields
 *
 * Body: { fieldIds: string[] }
 */
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { schemaName, workspaceId } = await requireTenantAuth();
    const { projectId } = await params;

    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace assigned' }, { status: 403 });
    }

    // Verify project access
    const project = await verifyProjectAccessTenant(schemaName, projectId, workspaceId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
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

    // Verify all field IDs belong to this project
    const existingFields = await listMetadataFields(schemaName, 'SOURCE', projectId);
    const existingFieldIds = new Set(existingFields.map((f) => f.id));

    for (const fieldId of fieldIds) {
      if (!existingFieldIds.has(fieldId)) {
        return NextResponse.json(
          { error: `Field ${fieldId} not found in this project` },
          { status: 400 }
        );
      }
    }

    await reorderMetadataFields(schemaName, fieldIds);

    // Return updated fields
    const fields = await listMetadataFields(schemaName, 'SOURCE', projectId);

    log.info({ projectId, fieldCount: fieldIds.length }, 'Metadata fields reordered');

    return NextResponse.json({ fields });
  } catch (error) {
    return handleAPIError(error, 'Failed to reorder metadata fields');
  }
}
