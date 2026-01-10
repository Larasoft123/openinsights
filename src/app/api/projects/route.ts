import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/api/auth';
import { handleAPIError } from '@/lib/api/error-handler';

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
    const { workspaceId } = await requireAuth();

    const projects = await prisma.project.findMany({
      where: { workspaceId },
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
    return handleAPIError(error, 'Failed to fetch projects');
  }
}

/**
 * POST /api/projects
 * Create a new project in the current user's workspace
 */
export async function POST(request: Request) {
  try {
    const { workspaceId } = await requireAuth();

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
        workspaceId,
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
    return handleAPIError(error, 'Failed to create project');
  }
}
