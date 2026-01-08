import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

const log = logger.child({ route: 'themes' });

// Validation schemas
const createThemeSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
});

/**
 * GET /api/projects/[projectId]/themes
 * List all themes for a project with highlight counts
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;

    const themes = await prisma.theme.findMany({
      where: { projectId },
      include: {
        _count: {
          select: { highlights: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    const result = themes.map((theme) => ({
      id: theme.id,
      name: theme.name,
      description: theme.description,
      color: theme.color,
      projectId: theme.projectId,
      highlightCount: theme._count.highlights,
      createdAt: theme.createdAt,
      updatedAt: theme.updatedAt,
    }));

    return NextResponse.json({ themes: result });
  } catch (error) {
    log.error({ error }, 'Failed to list themes');
    return NextResponse.json({ error: 'Failed to list themes' }, { status: 500 });
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
    const { projectId } = await params;
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

    // Check for duplicate name in same project
    const existing = await prisma.theme.findUnique({
      where: {
        projectId_name: { projectId, name },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Theme with this name already exists in the project' },
        { status: 400 }
      );
    }

    const theme = await prisma.theme.create({
      data: {
        name,
        description,
        color: color || '#6366F1',
        projectId,
      },
    });

    return NextResponse.json({ theme }, { status: 201 });
  } catch (error) {
    log.error({ error }, 'Failed to create theme');
    return NextResponse.json({ error: 'Failed to create theme' }, { status: 500 });
  }
}
