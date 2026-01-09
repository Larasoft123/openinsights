import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

const log = logger.child({ route: 'themes/[themeId]' });

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
    const { projectId, themeId } = await params;
    const body = await request.json();

    // Validate request body
    const parseResult = updateThemeSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parseResult.error.issues },
        { status: 400 }
      );
    }

    // Check theme exists and belongs to project
    const existing = await prisma.theme.findFirst({
      where: { id: themeId, projectId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Theme not found' }, { status: 404 });
    }

    const theme = await prisma.theme.update({
      where: { id: themeId },
      data: parseResult.data,
    });

    return NextResponse.json({ theme });
  } catch (error) {
    log.error({ error }, 'Failed to update theme');
    return NextResponse.json({ error: 'Failed to update theme' }, { status: 500 });
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
    const { projectId, themeId } = await params;

    // Check theme exists and belongs to project
    const existing = await prisma.theme.findFirst({
      where: { id: themeId, projectId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Theme not found' }, { status: 404 });
    }

    await prisma.theme.delete({
      where: { id: themeId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    log.error({ error }, 'Failed to delete theme');
    return NextResponse.json({ error: 'Failed to delete theme' }, { status: 500 });
  }
}
