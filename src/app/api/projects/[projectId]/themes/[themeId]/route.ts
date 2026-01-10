import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/api/auth';
import { handleAPIError } from '@/lib/api/error-handler';
import { verifyProjectAccess, verifyThemeAccess } from '@/lib/api/permissions';

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
    const { workspaceId } = await requireAuth();
    const { projectId, themeId } = await params;

    // Verify project and theme access
    await verifyProjectAccess(projectId, workspaceId);
    await verifyThemeAccess(themeId, projectId);

    const body = await request.json();

    // Validate request body
    const parseResult = updateThemeSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parseResult.error.issues },
        { status: 400 }
      );
    }

    const theme = await prisma.theme.update({
      where: { id: themeId },
      data: parseResult.data,
    });

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
    const { workspaceId } = await requireAuth();
    const { projectId, themeId } = await params;

    // Verify project and theme access
    await verifyProjectAccess(projectId, workspaceId);
    await verifyThemeAccess(themeId, projectId);

    await prisma.theme.delete({
      where: { id: themeId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleAPIError(error, 'Failed to delete theme');
  }
}
