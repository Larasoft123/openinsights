import { NextResponse } from 'next/server';
import { createThemeSchema } from '@/lib/validations';
import { requireTenantAuth } from '@/lib/api/auth';
import { handleAPIError } from '@/lib/api/error-handler';
import { verifyProjectAccessTenant, listThemes, createTheme } from '@/lib/db/tenant-queries';

/**
 * GET /api/projects/[projectId]/themes
 * List all themes for a project with highlight counts
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { schemaName, workspaceId } = await requireTenantAuth();
    const { projectId } = await params;

    // Verify project access
    const project = await verifyProjectAccessTenant(schemaName, projectId, workspaceId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const themes = await listThemes(schemaName, projectId);

    const result = themes.map((theme) => ({
      id: theme.id,
      name: theme.name,
      description: theme.description,
      color: theme.color,
      projectId: theme.projectId,
      highlightCount: theme._count?.highlights ?? 0,
      createdAt: theme.createdAt,
      updatedAt: theme.updatedAt,
    }));

    return NextResponse.json({ themes: result });
  } catch (error) {
    return handleAPIError(error, 'Failed to list themes');
  }
}

/**
 * POST /api/projects/[projectId]/themes
 * Create a new theme
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { schemaName, workspaceId } = await requireTenantAuth();
    const { projectId } = await params;

    // Verify project access
    const project = await verifyProjectAccessTenant(schemaName, projectId, workspaceId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const body = await request.json();

    // Validate request body
    const parseResult = createThemeSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parseResult.error.issues },
        { status: 400 }
      );
    }

    const { name, description, color } = parseResult.data;

    // Check for duplicate name in same project (createTheme will fail on unique constraint)
    // But let's provide a better error message
    const existingThemes = await listThemes(schemaName, projectId);
    const existing = existingThemes.find((t) => t.name === name);

    if (existing) {
      return NextResponse.json(
        { error: 'Theme with this name already exists in the project' },
        { status: 400 }
      );
    }

    const theme = await createTheme(schemaName, {
      projectId,
      name,
      description,
      color: color || '#6366F1',
    });

    return NextResponse.json({ theme }, { status: 201 });
  } catch (error) {
    return handleAPIError(error, 'Failed to create theme');
  }
}
