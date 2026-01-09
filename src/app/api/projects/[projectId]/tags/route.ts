import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { tagSchema } from '@/lib/validations';

const log = logger.child({ route: 'tags' });

/**
 * GET /api/projects/[projectId]/tags
 * Get all tags for a project with highlight counts
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId } = await params;

    // Verify project belongs to user's workspace
    const project = await prisma.project.findFirst({
      where: { id: projectId, workspaceId: session.user.workspaceId ?? undefined },
      select: { id: true },
    });
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const tags = await prisma.tag.findMany({
      where: { projectId },
      include: {
        _count: {
          select: { highlights: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    const result = tags.map((tag) => ({
      id: tag.id,
      name: tag.name,
      color: tag.color,
      description: tag.description,
      highlightCount: tag._count.highlights,
    }));

    return NextResponse.json({ tags: result });
  } catch (error) {
    log.error({ error }, 'Failed to get tags');
    return NextResponse.json({ error: 'Failed to get tags' }, { status: 500 });
  }
}

/**
 * POST /api/projects/[projectId]/tags
 * Create a new tag for a project
 *
 * Body: { name: string, color?: string, description?: string }
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId } = await params;

    // Verify project belongs to user's workspace
    const project = await prisma.project.findFirst({
      where: { id: projectId, workspaceId: session.user.workspaceId ?? undefined },
      select: { id: true },
    });
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const body = await request.json();

    // Validate request body
    const result = tagSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid tag data', details: result.error.issues },
        { status: 400 }
      );
    }

    const { name, color, description } = result.data;

    // Check for duplicate tag name in this project
    const existingTag = await prisma.tag.findFirst({
      where: { projectId, name },
    });
    if (existingTag) {
      return NextResponse.json(
        { error: 'A tag with this name already exists in this project' },
        { status: 409 }
      );
    }

    // Create the tag
    const tag = await prisma.tag.create({
      data: {
        name,
        color: color ?? '#3B82F6', // Default blue if not specified
        description,
        projectId,
      },
    });

    log.info({ projectId, tagId: tag.id, tagName: tag.name }, 'Tag created');

    return NextResponse.json({
      id: tag.id,
      name: tag.name,
      color: tag.color,
      description: tag.description,
    });
  } catch (error) {
    log.error({ error }, 'Failed to create tag');
    return NextResponse.json({ error: 'Failed to create tag' }, { status: 500 });
  }
}
