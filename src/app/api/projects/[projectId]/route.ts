import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireTenantAuth } from '@/lib/api/auth';
import { handleAPIError } from '@/lib/api/error-handler';
import {
  verifyProjectAccessTenant,
  updateProject,
  deleteProject,
  getProjectById,
} from '@/lib/db/tenant-queries';
import { projectLanguageSchema } from '@/lib/validations';

const updateProjectSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  description: z.string().nullish(),
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
  // AI Prompt Configuration
  sourceSummaryPrompt: z.string().nullish(),
  projectSummaryPrompt: z.string().nullish(),
  themeNamingPrompt: z.string().nullish(),
  autoTaggingPrompt: z.string().nullish(),
  autoTaggingEnabled: z.boolean().optional(),
  // Transcription Configuration
  transcriptionVocabulary: z.string().nullish(),
  transcriptionContext: z.string().nullish(),
});

/**
 * GET /api/projects/[projectId]
 * Get a single project by ID
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { schemaName, workspaceId } = await requireTenantAuth();
    const { projectId } = await params;

    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace assigned' }, { status: 403 });
    }

    // Verify project access
    const project = await verifyProjectAccessTenant(schemaName, projectId, workspaceId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Get full project with counts
    const fullProject = await getProjectById(schemaName, projectId);

    return NextResponse.json(fullProject);
  } catch (error) {
    return handleAPIError(error, 'Failed to fetch project');
  }
}

/**
 * PATCH /api/projects/[projectId]
 * Update project name and/or description
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { schemaName, workspaceId } = await requireTenantAuth();
    const { projectId } = await params;

    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace assigned' }, { status: 403 });
    }

    // Verify project access
    const existingProject = await verifyProjectAccessTenant(schemaName, projectId, workspaceId);
    if (!existingProject) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const body = await request.json();

    // Validate request body
    const parseResult = updateProjectSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parseResult.error.issues },
        { status: 400 }
      );
    }

    // Transform deadline string to Date if present
    const { deadline, ...restData } = parseResult.data;
    const updateData: Parameters<typeof updateProject>[2] = {
      ...restData,
      ...(deadline !== undefined && { deadline: deadline ? new Date(deadline) : null }),
    };

    const project = await updateProject(schemaName, projectId, updateData);

    return NextResponse.json({ project });
  } catch (error) {
    return handleAPIError(error, 'Failed to update project');
  }
}

/**
 * DELETE /api/projects/[projectId]
 * Permanently delete a project (only allowed for archived projects)
 * Requires project name confirmation in request body
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { schemaName, workspaceId } = await requireTenantAuth();
    const { projectId } = await params;

    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace assigned' }, { status: 403 });
    }

    // Verify project access
    const existingProject = await verifyProjectAccessTenant(schemaName, projectId, workspaceId);
    if (!existingProject) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Only allow deletion of archived projects
    if (!existingProject.archivedAt) {
      return NextResponse.json(
        { error: 'Only archived projects can be permanently deleted. Archive the project first.' },
        { status: 400 }
      );
    }

    // Require name confirmation
    const body = await request.json();
    if (!body.confirmName || body.confirmName !== existingProject.name) {
      return NextResponse.json(
        { error: 'Project name confirmation does not match' },
        { status: 400 }
      );
    }

    await deleteProject(schemaName, projectId);

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleAPIError(error, 'Failed to delete project');
  }
}
