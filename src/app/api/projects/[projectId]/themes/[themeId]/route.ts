import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireTenantAuth } from '@/lib/api/auth';
import { handleAPIError } from '@/lib/api/error-handler';
import {
  verifyProjectAccessTenant,
  verifyThemeAccessTenant,
  updateTheme,
  deleteTheme,
} from '@/lib/db/tenant-queries';

// Validation schemas
const updateThemeSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullish(), // accepts null, undefined, or string (DB column is nullable)
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(), // optional only - DB column is non-nullable with default
});

/**
 * PATCH /api/projects/[projectId]/themes/[themeId]
 * Update a theme
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ projectId: string; themeId: string }> }
) {
  try {
    const { schemaName, workspaceId } = await requireTenantAuth();
    const { projectId, themeId } = await params;

    // Verify project access
    const project = await verifyProjectAccessTenant(schemaName, projectId, workspaceId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Verify theme access
    const existingTheme = await verifyThemeAccessTenant(schemaName, themeId, projectId);
    if (!existingTheme) {
      return NextResponse.json({ error: 'Theme not found' }, { status: 404 });
    }

    const body = await request.json();

    // Validate request body
    const parseResult = updateThemeSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parseResult.error.issues },
        { status: 400 }
      );
    }

    const theme = await updateTheme(schemaName, themeId, parseResult.data);

    return NextResponse.json({ theme });
  } catch (error) {
    return handleAPIError(error, 'Failed to update theme');
  }
}

/**
 * DELETE /api/projects/[projectId]/themes/[themeId]
 * Delete a theme (cascades to highlight associations)
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ projectId: string; themeId: string }> }
) {
  try {
    const { schemaName, workspaceId } = await requireTenantAuth();
    const { projectId, themeId } = await params;

    // Verify project access
    const project = await verifyProjectAccessTenant(schemaName, projectId, workspaceId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Verify theme access
    const existingTheme = await verifyThemeAccessTenant(schemaName, themeId, projectId);
    if (!existingTheme) {
      return NextResponse.json({ error: 'Theme not found' }, { status: 404 });
    }

    await deleteTheme(schemaName, themeId);

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleAPIError(error, 'Failed to delete theme');
  }
}
