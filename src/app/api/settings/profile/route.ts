import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { requireTenantAuth } from '@/lib/api/auth';
import { handleAPIError } from '@/lib/api/error-handler';

const log = logger.child({ route: 'settings/profile' });

/**
 * Validation schema for profile update
 */
const updateProfileSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long').nullable().optional(),
  image: z.string().url('Invalid image URL').nullable().optional(),
});

/**
 * GET /api/settings/profile
 * Get current user profile
 */
export async function GET() {
  try {
    const { userId } = await requireTenantAuth();

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        emailVerified: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    return handleAPIError(error, 'Failed to get profile');
  }
}

/**
 * PATCH /api/settings/profile
 * Update current user profile
 *
 * Body:
 * {
 *   name?: string,
 *   image?: string | null
 * }
 */
export async function PATCH(request: Request) {
  try {
    const { userId } = await requireTenantAuth();

    const body = await request.json();

    // Validate request body
    const result = updateProfileSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid profile data', details: result.error.issues },
        { status: 400 }
      );
    }

    const { name, image } = result.data;

    // Build update payload (only include fields that were provided)
    const updateData: { name?: string | null; image?: string | null } = {};
    if (name !== undefined) {
      updateData.name = name;
    }
    if (image !== undefined) {
      updateData.image = image;
    }

    // Update user profile
    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        emailVerified: true,
        createdAt: true,
      },
    });

    log.info({ userId }, 'User profile updated');

    return NextResponse.json(user);
  } catch (error) {
    return handleAPIError(error, 'Failed to update profile');
  }
}
