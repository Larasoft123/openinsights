import { NextResponse } from 'next/server';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { requireTenantAuth } from '@/lib/api/auth';
import { handleAPIError } from '@/lib/api/error-handler';
import {
  getUserWorkspaceRole,
  updateWorkspace,
  deleteWorkspace,
} from '@/lib/db/tenant-queries/workspace-members';
import { getWorkspaceById } from '@/lib/db/tenant-queries/workspaces';

const log = logger.child({ route: 'workspaces/[workspaceId]' });

/**
 * Validation schema for updating a workspace
 */
const updateWorkspaceSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long').optional(),
});

interface RouteParams {
  params: Promise<{ workspaceId: string }>;
}

/**
 * GET /api/workspaces/[workspaceId]
 * Get a specific workspace
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { workspaceId } = await params;
    const { userId, schemaName } = await requireTenantAuth();

    // Check user has access to this workspace
    const userRole = await getUserWorkspaceRole(schemaName, workspaceId, userId);
    if (!userRole) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    const workspace = await getWorkspaceById(schemaName, workspaceId);
    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    return NextResponse.json({
      ...workspace,
      userRole,
    });
  } catch (error) {
    return handleAPIError(error, 'Failed to get workspace');
  }
}

/**
 * PATCH /api/workspaces/[workspaceId]
 * Update a workspace (owner only)
 *
 * Body:
 * {
 *   name?: string
 * }
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { workspaceId } = await params;
    const { userId, schemaName } = await requireTenantAuth();

    // Check user is owner of this workspace
    const userRole = await getUserWorkspaceRole(schemaName, workspaceId, userId);
    if (!userRole) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }
    if (userRole !== 'owner') {
      return NextResponse.json({ error: 'Only owners can update workspaces' }, { status: 403 });
    }

    const body = await request.json();

    // Validate request body
    const result = updateWorkspaceSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid workspace data', details: result.error.issues },
        { status: 400 }
      );
    }

    const workspace = await updateWorkspace(schemaName, workspaceId, result.data);
    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    log.info({ userId, workspaceId }, 'Workspace updated');

    return NextResponse.json(workspace);
  } catch (error) {
    return handleAPIError(error, 'Failed to update workspace');
  }
}

/**
 * DELETE /api/workspaces/[workspaceId]
 * Delete a workspace (owner only)
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { workspaceId } = await params;
    const { userId, schemaName } = await requireTenantAuth();

    // Check user is owner of this workspace
    const userRole = await getUserWorkspaceRole(schemaName, workspaceId, userId);
    if (!userRole) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }
    if (userRole !== 'owner') {
      return NextResponse.json({ error: 'Only owners can delete workspaces' }, { status: 403 });
    }

    const success = await deleteWorkspace(schemaName, workspaceId);
    if (!success) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    log.info({ userId, workspaceId }, 'Workspace deleted');

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleAPIError(error, 'Failed to delete workspace');
  }
}
