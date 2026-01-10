import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/api/auth';
import { handleAPIError } from '@/lib/api/error-handler';
import { verifyProjectAccess, verifyThemeAccess } from '@/lib/api/permissions';

// Validation schemas
const addHighlightSchema = z.object({
  highlightId: z.string().min(1),
});

/**
 * POST /api/projects/[projectId]/themes/[themeId]/highlights
 * Add a highlight to a theme
 */
export async function POST(
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
    const parseResult = addHighlightSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parseResult.error.issues },
        { status: 400 }
      );
    }

    const { highlightId } = parseResult.data;

    // Check highlight exists
    const highlight = await prisma.highlight.findUnique({
      where: { id: highlightId },
    });

    if (!highlight) {
      return NextResponse.json({ error: 'Highlight not found' }, { status: 404 });
    }

    // Check if association already exists
    const existing = await prisma.highlightTheme.findUnique({
      where: {
        highlightId_themeId: { highlightId, themeId },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Highlight is already assigned to this theme' },
        { status: 400 }
      );
    }

    await prisma.highlightTheme.create({
      data: {
        highlightId,
        themeId,
      },
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    return handleAPIError(error, 'Failed to add highlight to theme');
  }
}
