import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { requireTenantAuth } from '@/lib/api/auth';
import { handleAPIError } from '@/lib/api/error-handler';
import {
  getUserWorkspaceRole,
  getWorkspaceMembers,
  addWorkspaceMember,
} from '@/lib/db/tenant-queries/workspace-members';

const log = logger.child({ route: 'workspaces/[workspaceId]/members' });

/**
 * Validation schema for adding a member
 */
const addMemberSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['editor', 'viewer'], {
    message: 'Role must be editor or viewer',
  }),
});

interface RouteParams {
  params: Promise<{ workspaceId: string }>;
}

/**
 * GET /api/workspaces/[workspaceId]/members
 * Get all members of a workspace
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

    const members = await getWorkspaceMembers(schemaName, workspaceId);

    return NextResponse.json(members);
  } catch (error) {
    return handleAPIError(error, 'Failed to get workspace members');
  }
}

/**
 * POST /api/workspaces/[workspaceId]/members
 * Add a member to a workspace (owner only)
 *
 * Body:
 * {
 *   email: string,
 *   role: "editor" | "viewer"
 * }
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { workspaceId } = await params;
    const { userId, schemaName } = await requireTenantAuth();

    // Check user is owner of this workspace
    const userRole = await getUserWorkspaceRole(schemaName, workspaceId, userId);
    if (!userRole) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }
    if (userRole !== 'owner') {
      return NextResponse.json({ error: 'Only owners can add members' }, { status: 403 });
    }

    const body = await request.json();

    // Validate request body
    const result = addMemberSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid member data', details: result.error.issues },
        { status: 400 }
      );
    }

    const { email, role } = result.data;

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, email: true, image: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found. They must register first.' },
        { status: 404 }
      );
    }

    // Check if already a member
    const existingRole = await getUserWorkspaceRole(schemaName, workspaceId, user.id);
    if (existingRole) {
      return NextResponse.json(
        { error: 'User is already a member of this workspace' },
        { status: 409 }
      );
    }

    // Add member
    const member = await addWorkspaceMember(schemaName, workspaceId, user.id, role);

    log.info({ userId, workspaceId, addedUserId: user.id, role }, 'Workspace member added');

    return NextResponse.json({
      ...member,
      user,
    });
  } catch (error) {
    return handleAPIError(error, 'Failed to add workspace member');
  }
}
