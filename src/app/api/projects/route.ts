import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireTenantAuth } from '@/lib/api/auth';
import { handleAPIError } from '@/lib/api/error-handler';
import { listProjects, createProject, type ProjectFilter } from '@/lib/db/tenant-queries';
import { projectLanguageSchema } from '@/lib/validations';

const createProjectSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  language: projectLanguageSchema.optional(),
  // Project Settings
  projectType: z.string().nullish(),
  goals: z.string().nullish(),
  context: z.string().nullish(),
  deadline: z.string().datetime().nullish(),
  stakeholder: z.string().nullish(),
  researchQuestions: z.string().nullish(),
  targetParticipants: z.number().int().positive().nullish(),
  recruitmentCriteria: z.string().nullish(),
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

    // Parse filter from query params
    const { searchParams } = new URL(request.url);
    const filterParam = searchParams.get('filter');
    const filter: ProjectFilter =
      filterParam === 'archived' || filterParam === 'all' ? filterParam : 'active';

    const projects = await listProjects(schemaName, workspaceId, filter);

    // Transform source thumbnail IDs to proxy URLs
    const projectsWithThumbnailUrls = projects.map((project) => ({
      ...project,
      sourceThumbnails: (project.sourceThumbnailIds || []).map(
        (id: string) => `/api/sources/${id}/thumbnail`
      ),
    }));

    return NextResponse.json(projectsWithThumbnailUrls);
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

    const body = await request.json();
    const result = createProjectSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
    }

    const {
      name,
      description,
      language,
      projectType,
      goals,
      context,
      deadline,
      stakeholder,
      researchQuestions,
      targetParticipants,
      recruitmentCriteria,
    } = result.data;

    const project = await createProject(schemaName, {
      workspaceId,
      name,
      description: description || null,
      language,
      projectType: projectType || null,
      goals: goals || null,
      context: context || null,
      deadline: deadline ? new Date(deadline) : null,
      stakeholder: stakeholder || null,
      researchQuestions: researchQuestions || null,
      targetParticipants: targetParticipants || null,
      recruitmentCriteria: recruitmentCriteria || null,
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    return handleAPIError(error, 'Failed to create project');
  }
}
