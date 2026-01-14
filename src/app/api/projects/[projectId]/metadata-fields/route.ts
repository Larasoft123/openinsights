import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { createMetadataFieldSchema } from '@/lib/validations';
import { requireTenantAuth } from '@/lib/api/auth';
import { handleAPIError } from '@/lib/api/error-handler';
import {
  verifyProjectAccessTenant,
  listMetadataFields,
  getMetadataFieldByName,
  createMetadataField,
} from '@/lib/db/tenant-queries';

const log = logger.child({ route: 'metadata-fields' });

interface RouteParams {
  params: Promise<{ projectId: string }>;
}

/**
 * GET /api/projects/[projectId]/metadata-fields
 * Get all metadata fields for SOURCE entities in this project
 */
export async function GET(_request: Request, { params }: RouteParams) {
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

    const fields = await listMetadataFields(schemaName, 'SOURCE', projectId);

    return NextResponse.json({ fields });
  } catch (error) {
    return handleAPIError(error, 'Failed to get metadata fields');
  }
}

/**
 * POST /api/projects/[projectId]/metadata-fields
 * Create a new metadata field for SOURCE entities in this project
 *
 * Body: { name: string, label: string, fieldType: string, options?: string[], required?: boolean, placeholder?: string }
 */
export async function POST(request: Request, { params }: RouteParams) {
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

    // Force entityType to SOURCE for this endpoint
    const dataWithEntityType = { ...body, entityType: 'SOURCE' };

    // Validate request body
    const result = createMetadataFieldSchema.safeParse(dataWithEntityType);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid field data', details: result.error.issues },
        { status: 400 }
      );
    }

    const { name, label, fieldType, options, required, placeholder, displayOrder } = result.data;

    // Check for duplicate field name in this project
    const existingField = await getMetadataFieldByName(schemaName, 'SOURCE', projectId, name);
    if (existingField) {
      return NextResponse.json(
        { error: 'A field with this name already exists in this project' },
        { status: 409 }
      );
    }

    // Create the field
    const field = await createMetadataField(schemaName, {
      entityType: 'SOURCE',
      parentId: projectId,
      name,
      label,
      fieldType,
      options,
      required,
      placeholder,
      displayOrder,
    });

    log.info({ projectId, fieldId: field.id, fieldName: field.name }, 'Metadata field created');

    return NextResponse.json({ field }, { status: 201 });
  } catch (error) {
    return handleAPIError(error, 'Failed to create metadata field');
  }
}
