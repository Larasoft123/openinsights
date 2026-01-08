import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

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
    console.error('Failed to get tags:', error);
    return NextResponse.json({ error: 'Failed to get tags' }, { status: 500 });
  }
}
