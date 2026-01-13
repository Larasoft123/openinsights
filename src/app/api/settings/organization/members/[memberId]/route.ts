import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { requireRole } from '@/lib/api/auth';
import { handleAPIError } from '@/lib/api/error-handler';

const log = logger.child({ route: 'settings/organization/members/[memberId]' });

/**
 * Validation schema for updating member role
 */
const updateMemberSchema = z.object({
  role: z.enum(['OWNER', 'ADMIN', 'MEMBER'], {
    message: 'Role must be OWNER, ADMIN, or MEMBER',
  }),
});

interface RouteParams {
  params: Promise<{ memberId: string }>;
}

/**
 * PATCH /api/settings/organization/members/[memberId]
 * Update a member's role (OWNER only)
 *
 * Body:
 * {
 *   role: "OWNER" | "ADMIN" | "MEMBER"
 * }
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { memberId } = await params;
    const { organizationId, userId: currentUserId } = await requireRole('OWNER');

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
    const member = await prisma.organizationMember.findUnique({
      where: { id: memberId },
      include: { user: true },
    });

    if (!member || member.organizationId !== organizationId) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Prevent demoting yourself if you're the only owner
    if (member.userId === currentUserId && newRole !== 'OWNER') {
      const ownerCount = await prisma.organizationMember.count({
        where: {
          organizationId,
          role: 'OWNER',
        },
      });

      if (ownerCount <= 1) {
        return NextResponse.json(
          { error: 'Cannot demote yourself. Transfer ownership first.' },
          { status: 400 }
        );
      }
    }

    // If transferring ownership (promoting someone to OWNER)
    // and current user is OWNER, we may want to demote current user
    // For now, allow multiple owners
    const updated = await prisma.organizationMember.update({
      where: { id: memberId },
      data: { role: newRole },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    log.info(
      { organizationId, memberId, oldRole: member.role, newRole, changedBy: currentUserId },
      'Member role updated'
    );

    return NextResponse.json({
      id: updated.id,
      userId: updated.userId,
      role: updated.role,
      invitedAt: updated.invitedAt,
      joinedAt: updated.joinedAt,
      isPending: updated.joinedAt === null,
      user: updated.user,
    });
  } catch (error) {
    return handleAPIError(error, 'Failed to update member');
  }
}

/**
 * DELETE /api/settings/organization/members/[memberId]
 * Remove a member from the organization (ADMIN+ role required)
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { memberId } = await params;
    const { organizationId, userId: currentUserId, role: currentRole } = await requireRole('ADMIN');

    // Get the member to delete
    const member = await prisma.organizationMember.findUnique({
      where: { id: memberId },
    });

    if (!member || member.organizationId !== organizationId) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Prevent removing the last owner
    if (member.role === 'OWNER') {
      const ownerCount = await prisma.organizationMember.count({
        where: {
          organizationId,
          role: 'OWNER',
        },
      });

      if (ownerCount <= 1) {
        return NextResponse.json({ error: 'Cannot remove the only owner' }, { status: 400 });
      }

      // Only owners can remove other owners
      if (currentRole !== 'OWNER') {
        return NextResponse.json({ error: 'Only owners can remove other owners' }, { status: 403 });
      }
    }

    // Prevent admins from removing other admins (only owners can)
    if (member.role === 'ADMIN' && currentRole !== 'OWNER') {
      return NextResponse.json({ error: 'Only owners can remove admins' }, { status: 403 });
    }

    // Prevent removing yourself
    if (member.userId === currentUserId) {
      return NextResponse.json(
        { error: 'Cannot remove yourself. Leave the organization instead.' },
        { status: 400 }
      );
    }

    await prisma.organizationMember.delete({
      where: { id: memberId },
    });

    log.info(
      { organizationId, memberId, removedUserId: member.userId, removedBy: currentUserId },
      'Member removed'
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleAPIError(error, 'Failed to remove member');
  }
}
