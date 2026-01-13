import { NextResponse } from 'next/server';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { requireTenantAuth } from '@/lib/api/auth';
import { handleAPIError } from '@/lib/api/error-handler';
import {
  getUserWorkspaceRole,
  getWorkspaceMemberById,
  updateWorkspaceMemberRole,
  removeWorkspaceMember,
  countWorkspaceOwners,
} from '@/lib/db/tenant-queries/workspace-members';

const log = logger.child({ route: 'workspaces/[workspaceId]/members/[memberId]' });

/**
 * Validation schema for updating member role
 */
const updateMemberSchema = z.object({
  role: z.enum(['owner', 'editor', 'viewer'], {
    message: 'Role must be owner, editor, or viewer',
  }),
});

interface RouteParams {
  params: Promise<{ workspaceId: string; memberId: string }>;
}

/**
 * PATCH /api/workspaces/[workspaceId]/members/[memberId]
 * Update a member's role (owner only)
 *
 * Body:
 * {
 *   role: "owner" | "editor" | "viewer"
 * }
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { workspaceId, memberId } = await params;
    const { userId, schemaName } = await requireTenantAuth();

    // Check user is owner of this workspace
    const userRole = await getUserWorkspaceRole(schemaName, workspaceId, userId);
    if (!userRole) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }
    if (userRole !== 'owner') {
      return NextResponse.json({ error: 'Only owners can change roles' }, { status: 403 });
    }

    const body = await request.json();

    // Validate request body
    const result = updateMemberSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid role', details: result.error.issues },
        { status: 400 }
      );
    }

    const { role: newRole } = result.data;

    // Get the member to update
    const member = await getWorkspaceMemberById(schemaName, memberId);
    if (!member || member.workspaceId !== workspaceId) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Prevent demoting yourself if you're the only owner
    if (member.userId === userId && member.role === 'owner' && newRole !== 'owner') {
      const ownerCount = await countWorkspaceOwners(schemaName, workspaceId);
      if (ownerCount <= 1) {
        return NextResponse.json(
          { error: 'Cannot demote yourself. Transfer ownership first.' },
          { status: 400 }
        );
      }
    }

    // Update role
    const updated = await updateWorkspaceMemberRole(schemaName, memberId, newRole);
    if (!updated) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    log.info(
      { userId, workspaceId, memberId, oldRole: member.role, newRole },
      'Workspace member role updated'
    );

    return NextResponse.json(updated);
  } catch (error) {
    return handleAPIError(error, 'Failed to update member role');
  }
}

/**
 * DELETE /api/workspaces/[workspaceId]/members/[memberId]
 * Remove a member from a workspace (owner only)
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { workspaceId, memberId } = await params;
    const { userId, schemaName } = await requireTenantAuth();

    // Check user is owner of this workspace
    const userRole = await getUserWorkspaceRole(schemaName, workspaceId, userId);
    if (!userRole) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }
    if (userRole !== 'owner') {
      return NextResponse.json({ error: 'Only owners can remove members' }, { status: 403 });
    }

    // Get the member to remove
    const member = await getWorkspaceMemberById(schemaName, memberId);
    if (!member || member.workspaceId !== workspaceId) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Prevent removing the last owner
    if (member.role === 'owner') {
      const ownerCount = await countWorkspaceOwners(schemaName, workspaceId);
      if (ownerCount <= 1) {
        return NextResponse.json({ error: 'Cannot remove the only owner' }, { status: 400 });
      }
    }

    // Prevent removing yourself
    if (member.userId === userId) {
      return NextResponse.json(
        { error: 'Cannot remove yourself. Leave the workspace instead.' },
        { status: 400 }
      );
    }

    // Remove member
    const success = await removeWorkspaceMember(schemaName, memberId);
    if (!success) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    log.info(
      { userId, workspaceId, memberId, removedUserId: member.userId },
      'Workspace member removed'
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleAPIError(error, 'Failed to remove member');
  }
}
