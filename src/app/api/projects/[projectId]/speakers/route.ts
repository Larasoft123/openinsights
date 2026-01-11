import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/api/auth';
import { handleAPIError } from '@/lib/api/error-handler';
import { verifyProjectAccess } from '@/lib/api/permissions';

interface RouteContext {
  params: Promise<{ projectId: string }>;
}

/**
 * GET /api/projects/[projectId]/speakers
 * Get all custom speaker names for a project
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { workspaceId } = await requireAuth();
    const { projectId } = await context.params;

    await verifyProjectAccess(projectId, workspaceId);

    const speakerNames = await prisma.speakerName.findMany({
      where: { projectId },
      select: {
        speakerId: true,
        customName: true,
      },
    });

    // Transform to a simple map for easy client-side usage
    const namesMap: Record<string, string> = {};
    for (const sn of speakerNames) {
      namesMap[sn.speakerId] = sn.customName;
    }

    return NextResponse.json({ speakerNames: namesMap });
  } catch (error) {
    return handleAPIError(error, 'Failed to fetch speaker names');
  }
}

/**
 * PUT /api/projects/[projectId]/speakers
 * Create or update a speaker name
 * Body: { speakerId: string, customName: string }
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { workspaceId } = await requireAuth();
    const { projectId } = await context.params;

    await verifyProjectAccess(projectId, workspaceId);

    const { speakerId, customName } = await request.json();

    if (!speakerId || typeof speakerId !== 'string') {
      return NextResponse.json({ error: 'speakerId is required' }, { status: 400 });
    }

    // If customName is empty, delete the record
    if (!customName || customName.trim() === '') {
      await prisma.speakerName.deleteMany({
        where: { projectId, speakerId },
      });
      return NextResponse.json({ success: true, deleted: true });
    }

    // Upsert the speaker name
    const result = await prisma.speakerName.upsert({
      where: {
        projectId_speakerId: { projectId, speakerId },
      },
      update: {
        customName: customName.trim(),
      },
      create: {
        projectId,
        speakerId,
        customName: customName.trim(),
      },
    });

    return NextResponse.json({
      success: true,
      speakerName: {
        speakerId: result.speakerId,
        customName: result.customName,
      },
    });
  } catch (error) {
    return handleAPIError(error, 'Failed to update speaker name');
  }
}
