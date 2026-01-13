import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { requireRole } from '@/lib/api/auth';
import { handleAPIError } from '@/lib/api/error-handler';

const log = logger.child({ route: 'settings/organization' });

/**
 * Validation schema for organization update (OWNER only)
 */
const updateOrgSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long').optional(),
});

/**
 * GET /api/settings/organization
 * Get current organization info (ADMIN+ role required)
 */
export async function GET() {
  try {
    const { organizationId } = await requireRole('ADMIN');

    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        name: true,
        slug: true,
        createdAt: true,
        _count: {
          select: {
            members: true,
          },
        },
      },
    });

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    return NextResponse.json({
      ...organization,
      memberCount: organization._count.members,
    });
  } catch (error) {
    return handleAPIError(error, 'Failed to get organization');
  }
}

/**
 * PATCH /api/settings/organization
 * Update organization info (OWNER only)
 *
 * Body:
 * {
 *   name?: string
 * }
 */
export async function PATCH(request: Request) {
  try {
    const { organizationId } = await requireRole('OWNER');

    const body = await request.json();

    // Validate request body
    const result = updateOrgSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid organization data', details: result.error.issues },
        { status: 400 }
      );
    }

    const { name } = result.data;

    // Build update payload
    const updateData: { name?: string } = {};
    if (name !== undefined) {
      updateData.name = name;
    }

    const organization = await prisma.organization.update({
      where: { id: organizationId },
      data: updateData,
      select: {
        id: true,
        name: true,
        slug: true,
        createdAt: true,
        _count: {
          select: {
            members: true,
          },
        },
      },
    });

    log.info({ organizationId }, 'Organization updated');

    return NextResponse.json({
      ...organization,
      memberCount: organization._count.members,
    });
  } catch (error) {
    return handleAPIError(error, 'Failed to update organization');
  }
}
