import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { createMetadataFieldSchema } from '@/lib/validations';
import { requireTenantAuth } from '@/lib/api/auth';
import { handleAPIError } from '@/lib/api/error-handler';
import { getUserWorkspaceRole } from '@/lib/db/tenant-queries/workspace-members';
import {
  listMetadataFields,
  getMetadataFieldByName,
  createMetadataField,
} from '@/lib/db/tenant-queries';

const log = logger.child({ route: 'workspace-metadata-fields' });

interface RouteParams {
  params: Promise<{ workspaceId: string }>;
}

/**
 * GET /api/workspaces/[workspaceId]/metadata-fields
 * Get all metadata fields for PROJECT entities in this workspace
 */
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { schemaName, userId } = await requireTenantAuth();
    const { workspaceId } = await params;

    // Verify workspace access
    const userRole = await getUserWorkspaceRole(schemaName, workspaceId, userId);
    if (!userRole) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    const fields = await listMetadataFields(schemaName, 'PROJECT', workspaceId);

    return NextResponse.json({ fields });
  } catch (error) {
    return handleAPIError(error, 'Failed to get metadata fields');
  }
}

/**
 * POST /api/workspaces/[workspaceId]/metadata-fields
 * Create a new metadata field for PROJECT entities in this workspace
 *
 * Body: { name: string, label: string, fieldType: string, options?: string[], required?: boolean, placeholder?: string }
 */
export async function POST(request: Request, { params }: RouteParams) {
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
        { error: 'You do not have permission to create metadata fields' },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Force entityType to PROJECT for this endpoint
    const dataWithEntityType = { ...body, entityType: 'PROJECT' };

    // Validate request body
    const result = createMetadataFieldSchema.safeParse(dataWithEntityType);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid field data', details: result.error.issues },
        { status: 400 }
      );
    }

    const { name, label, fieldType, options, required, placeholder, displayOrder } = result.data;

    // Check for duplicate field name in this workspace
    const existingField = await getMetadataFieldByName(schemaName, 'PROJECT', workspaceId, name);
    if (existingField) {
      return NextResponse.json(
        { error: 'A field with this name already exists in this workspace' },
        { status: 409 }
      );
    }

    // Create the field
    const field = await createMetadataField(schemaName, {
      entityType: 'PROJECT',
      parentId: workspaceId,
      name,
      label,
      fieldType,
      options,
      required,
      placeholder,
      displayOrder,
    });

    log.info({ workspaceId, fieldId: field.id, fieldName: field.name }, 'Metadata field created');

    return NextResponse.json({ field }, { status: 201 });
  } catch (error) {
    return handleAPIError(error, 'Failed to create metadata field');
  }
}
