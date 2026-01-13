import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { upsertMetadataValuesSchema } from '@/lib/validations';
import { requireTenantAuth } from '@/lib/api/auth';
import { handleAPIError } from '@/lib/api/error-handler';
import {
  verifyProjectAccessTenant,
  getMetadataWithFields,
  upsertMetadataValues,
  listMetadataFields,
  getProjectById,
} from '@/lib/db/tenant-queries';

const log = logger.child({ route: 'project-metadata' });

interface RouteParams {
  params: Promise<{ projectId: string }>;
}

/**
 * GET /api/projects/[projectId]/metadata
 * Get metadata fields with values for a project
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

    // Get the full project to get workspaceId for field lookup
    const fullProject = await getProjectById(schemaName, projectId);
    if (!fullProject) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Get fields with values (PROJECT fields are defined at workspace level)
    const fieldsWithValues = await getMetadataWithFields(
      schemaName,
      'PROJECT',
      fullProject.workspaceId,
      projectId
    );

    return NextResponse.json({ fields: fieldsWithValues });
  } catch (error) {
    return handleAPIError(error, 'Failed to get project metadata');
  }
}

/**
 * PUT /api/projects/[projectId]/metadata
 * Update metadata values for a project
 *
 * Body: { values: [{ fieldId: string, value: string | null }] }
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

    // Get the full project to get workspaceId for field lookup
    const fullProject = await getProjectById(schemaName, projectId);
    if (!fullProject) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
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

    // Verify all field IDs belong to this workspace
    const existingFields = await listMetadataFields(schemaName, 'PROJECT', fullProject.workspaceId);
    const existingFieldIds = new Set(existingFields.map((f) => f.id));

    for (const { fieldId } of values) {
      if (!existingFieldIds.has(fieldId)) {
        return NextResponse.json(
          { error: `Field ${fieldId} not found in this workspace` },
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
      projectId,
      values.map((v) => ({ fieldId: v.fieldId, value: v.value ?? null }))
    );

    // Return updated fields with values
    const fieldsWithValues = await getMetadataWithFields(
      schemaName,
      'PROJECT',
      fullProject.workspaceId,
      projectId
    );

    log.info({ projectId, valueCount: values.length }, 'Project metadata updated');

    return NextResponse.json({ fields: fieldsWithValues });
  } catch (error) {
    return handleAPIError(error, 'Failed to update project metadata');
  }
}
