import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

const createProjectSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
});

/**
 * GET /api/projects
 * List all projects for the current user's workspace
 */
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!session.user.workspaceId) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 400 });
    }

    const projects = await prisma.project.findMany({
      where: {
        workspaceId: session.user.workspaceId,
      },
      include: {
        _count: {
          select: {
            sources: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    return NextResponse.json(projects);
  } catch (error) {
    console.error('Failed to fetch projects:', error);
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
  }
}

/**
 * POST /api/projects
 * Create a new project in the current user's workspace
 */
export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!session.user.workspaceId) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 400 });
    }

    const body = await request.json();
    const result = createProjectSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
    }

    const { name, description } = result.data;

    const project = await prisma.project.create({
      data: {
        name,
        description: description || null,
        workspaceId: session.user.workspaceId,
      },
      include: {
        _count: {
          select: {
            sources: true,
          },
        },
      },
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error('Failed to create project:', error);
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
  }
}
