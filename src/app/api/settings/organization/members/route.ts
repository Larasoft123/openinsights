import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { requireRole } from '@/lib/api/auth';
import { handleAPIError } from '@/lib/api/error-handler';

const log = logger.child({ route: 'settings/organization/members' });

/**
 * Validation schema for inviting a member
 */
const inviteMemberSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['ADMIN', 'MEMBER'], {
    message: 'Role must be ADMIN or MEMBER',
  }),
});

/**
 * GET /api/settings/organization/members
 * Get all members of the current organization (ADMIN+ role required)
 */
export async function GET() {
  try {
    const { organizationId } = await requireRole('ADMIN');

    const members = await prisma.organizationMember.findMany({
      where: { organizationId },
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
      orderBy: [
        { role: 'desc' }, // OWNER first, then ADMIN, then MEMBER
        { joinedAt: 'asc' },
      ],
    });

    return NextResponse.json(
      members.map((m) => ({
        id: m.id,
        userId: m.userId,
        role: m.role,
        invitedAt: m.invitedAt,
        joinedAt: m.joinedAt,
        isPending: m.joinedAt === null,
        user: m.user,
      }))
    );
  } catch (error) {
    return handleAPIError(error, 'Failed to get members');
  }
}

/**
 * POST /api/settings/organization/members
 * Invite a new member to the organization (ADMIN+ role required)
 *
 * Body:
 * {
 *   email: string,
 *   role: "ADMIN" | "MEMBER"
 * }
 */
export async function POST(request: Request) {
  try {
    const { organizationId, userId: currentUserId } = await requireRole('ADMIN');

    const body = await request.json();

    // Validate request body
    const result = inviteMemberSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid invite data', details: result.error.issues },
        { status: 400 }
      );
    }

    const { email, role } = result.data;

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true },
    });

    // If user doesn't exist, we could either:
    // 1. Create a placeholder user (for invite flow)
    // 2. Return error and require registration first
    // For MVP, we'll require the user to exist
    if (!user) {
      return NextResponse.json(
        { error: 'User not found. They must register first.' },
        { status: 404 }
      );
    }

    // Check if already a member
    const existingMember = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId: user.id,
        },
      },
    });

    if (existingMember) {
      return NextResponse.json(
        { error: 'User is already a member of this organization' },
        { status: 409 }
      );
    }

    // Create membership (joinedAt = now means immediately active)
    // For a proper invite flow, joinedAt would be null until accepted
    const member = await prisma.organizationMember.create({
      data: {
        organizationId,
        userId: user.id,
        role,
        invitedAt: new Date(),
        joinedAt: new Date(), // Auto-accept for MVP
      },
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
      { organizationId, invitedUserId: user.id, role, invitedBy: currentUserId },
      'Member added'
    );

    return NextResponse.json({
      id: member.id,
      userId: member.userId,
      role: member.role,
      invitedAt: member.invitedAt,
      joinedAt: member.joinedAt,
      isPending: member.joinedAt === null,
      user: member.user,
    });
  } catch (error) {
    return handleAPIError(error, 'Failed to invite member');
  }
}
