import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

const log = logger.child({ route: 'themes/[themeId]/highlights' });

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
    const { projectId, themeId } = await params;
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

    // Check theme exists and belongs to project
    const theme = await prisma.theme.findFirst({
      where: { id: themeId, projectId },
    });

    if (!theme) {
      return NextResponse.json({ error: 'Theme not found' }, { status: 404 });
    }

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
    log.error({ error }, 'Failed to add highlight to theme');
    return NextResponse.json({ error: 'Failed to add highlight to theme' }, { status: 500 });
  }
}
