import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createThemeSchema } from '@/lib/validations';
import { requireAuth } from '@/lib/api/auth';
import { handleAPIError } from '@/lib/api/error-handler';
import { verifyProjectAccess } from '@/lib/api/permissions';

/**
 * GET /api/projects/[projectId]/themes
 * List all themes for a project with highlight counts
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { workspaceId } = await requireAuth();
    const { projectId } = await params;

    // Verify project access
    await verifyProjectAccess(projectId, workspaceId);

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
    const { workspaceId } = await requireAuth();
    const { projectId } = await params;

    // Verify project access
    await verifyProjectAccess(projectId, workspaceId);

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
    return handleAPIError(error, 'Failed to create theme');
  }
}
