import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

const log = logger.child({ route: 'themes/[themeId]/highlights/[highlightId]' });

/**
 * DELETE /api/projects/[projectId]/themes/[themeId]/highlights/[highlightId]
 * Remove a highlight from a theme
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ projectId: string; themeId: string; highlightId: string }> }
) {
  try {
    const { projectId, themeId, highlightId } = await params;

    // Check theme exists and belongs to project
    const theme = await prisma.theme.findFirst({
      where: { id: themeId, projectId },
    });

    if (!theme) {
      return NextResponse.json({ error: 'Theme not found' }, { status: 404 });
    }

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
    log.error({ error }, 'Failed to remove highlight from theme');
    return NextResponse.json({ error: 'Failed to remove highlight from theme' }, { status: 500 });
  }
}
