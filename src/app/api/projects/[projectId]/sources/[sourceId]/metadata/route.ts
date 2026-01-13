import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { upsertMetadataValuesSchema } from '@/lib/validations';
import { requireTenantAuth } from '@/lib/api/auth';
import { handleAPIError } from '@/lib/api/error-handler';
import {
  verifyProjectAccessTenant,
  verifySourceAccessTenant,
  getMetadataWithFields,
  upsertMetadataValues,
  listMetadataFields,
} from '@/lib/db/tenant-queries';

const log = logger.child({ route: 'source-metadata' });

interface RouteParams {
  params: Promise<{ projectId: string; sourceId: string }>;
}

/**
 * GET /api/projects/[projectId]/sources/[sourceId]/metadata
 * Get metadata fields with values for a source
 */
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { schemaName, workspaceId } = await requireTenantAuth();
    const { projectId, sourceId } = await params;

    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace assigned' }, { status: 403 });
    }

    // Verify project access
    const project = await verifyProjectAccessTenant(schemaName, projectId, workspaceId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Verify source access
    const source = await verifySourceAccessTenant(schemaName, sourceId, workspaceId);
    if (!source) {
      return NextResponse.json({ error: 'Source not found' }, { status: 404 });
    }

    // Get fields with values
    const fieldsWithValues = await getMetadataWithFields(schemaName, 'SOURCE', projectId, sourceId);

    return NextResponse.json({ fields: fieldsWithValues });
  } catch (error) {
    return handleAPIError(error, 'Failed to get source metadata');
  }
}

/**
 * PUT /api/projects/[projectId]/sources/[sourceId]/metadata
 * Update metadata values for a source
 *
 * Body: { values: [{ fieldId: string, value: string | null }] }
 */
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { schemaName, workspaceId } = await requireTenantAuth();
    const { projectId, sourceId } = await params;

    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace assigned' }, { status: 403 });
    }

    // Verify project access
    const project = await verifyProjectAccessTenant(schemaName, projectId, workspaceId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Verify source access
    const source = await verifySourceAccessTenant(schemaName, sourceId, workspaceId);
    if (!source) {
      return NextResponse.json({ error: 'Source not found' }, { status: 404 });
    }

    const body = await request.json();

    // Validate request body
    const result = upsertMetadataValuesSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: result.error.issues },
        { status: 400 }
      );
    }

    const { values } = result.data;

    // Verify all field IDs belong to this project
    const existingFields = await listMetadataFields(schemaName, 'SOURCE', projectId);
    const existingFieldIds = new Set(existingFields.map((f) => f.id));

    for (const { fieldId } of values) {
      if (!existingFieldIds.has(fieldId)) {
        return NextResponse.json(
          { error: `Field ${fieldId} not found in this project` },
          { status: 400 }
        );
      }
    }

    // Validate required fields
    const requiredFields = existingFields.filter((f) => f.required);
    for (const requiredField of requiredFields) {
      const valueEntry = values.find((v) => v.fieldId === requiredField.id);
      if (!valueEntry || !valueEntry.value) {
        return NextResponse.json(
          { error: `Field "${requiredField.label}" is required` },
          { status: 400 }
        );
      }
    }

    // Upsert values
    await upsertMetadataValues(
      schemaName,
      sourceId,
      values.map((v) => ({ fieldId: v.fieldId, value: v.value ?? null }))
    );

    // Return updated fields with values
    const fieldsWithValues = await getMetadataWithFields(schemaName, 'SOURCE', projectId, sourceId);

    log.info({ projectId, sourceId, valueCount: values.length }, 'Source metadata updated');

    return NextResponse.json({ fields: fieldsWithValues });
  } catch (error) {
    return handleAPIError(error, 'Failed to update source metadata');
  }
}
