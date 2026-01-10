import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/api/auth';
import { handleAPIError } from '@/lib/api/error-handler';
import { verifyProjectAccess, verifyThemeAccess } from '@/lib/api/permissions';

/**
 * DELETE /api/projects/[projectId]/themes/[themeId]/highlights/[highlightId]
 * Remove a highlight from a theme
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ projectId: string; themeId: string; highlightId: string }> }
) {
  try {
    const { workspaceId } = await requireAuth();
    const { projectId, themeId, highlightId } = await params;

    // Verify project and theme access
    await verifyProjectAccess(projectId, workspaceId);
    await verifyThemeAccess(themeId, projectId);

    // Check if association exists
    const existing = await prisma.highlightTheme.findUnique({
      where: {
        highlightId_themeId: { highlightId, themeId },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Highlight is not assigned to this theme' },
        { status: 404 }
      );
    }

    await prisma.highlightTheme.delete({
      where: {
        highlightId_themeId: { highlightId, themeId },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleAPIError(error, 'Failed to remove highlight from theme');
  }
}
