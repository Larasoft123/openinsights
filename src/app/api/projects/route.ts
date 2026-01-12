import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireTenantAuth } from '@/lib/api/auth';
import { handleAPIError } from '@/lib/api/error-handler';
import { listProjects, createProject, type ProjectFilter } from '@/lib/db/tenant-queries';

const createProjectSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
});

/**
 * GET /api/projects
 * List all projects for the current user's workspace
 * Query params:
 *   - filter: 'active' | 'archived' | 'all' (default: 'active')
 */
export async function GET(request: Request) {
  try {
    const { schemaName, workspaceId } = await requireTenantAuth();

    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace assigned' }, { status: 403 });
    }

    // Parse filter from query params
    const { searchParams } = new URL(request.url);
    const filterParam = searchParams.get('filter');
    const filter: ProjectFilter =
      filterParam === 'archived' || filterParam === 'all' ? filterParam : 'active';

    const projects = await listProjects(schemaName, workspaceId, filter);

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
    const { schemaName, workspaceId } = await requireTenantAuth();

    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace assigned' }, { status: 403 });
    }

    const body = await request.json();
    const result = createProjectSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
    }

    const { name, description } = result.data;

    const project = await createProject(schemaName, {
      workspaceId,
      name,
      description: description || null,
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    return handleAPIError(error, 'Failed to create project');
  }
}
