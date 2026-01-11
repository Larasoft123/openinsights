import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { validateShareLink } from '@/lib/services/share.service';

interface RouteContext {
  params: Promise<{ projectId: string }>;
}

/**
 * GET /api/public/projects/[projectId]/speakers?token=xxx
 * Get speaker names for a shared project (public endpoint)
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { projectId } = await context.params;
    const token = request.nextUrl.searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Share token required' }, { status: 401 });
    }

    // Validate the share link
    const shareLink = await validateShareLink(token);

    if (!shareLink) {
      return NextResponse.json({ error: 'Invalid or expired share link' }, { status: 401 });
    }

    // Verify project access - either direct project share or source share within project
    const isSourceShare = shareLink.sourceId !== null;
    let authorizedProjectId: string;

    if (isSourceShare) {
      // For source shares, get the project from the source
      const source = await prisma.source.findUnique({
        where: { id: shareLink.sourceId! },
        select: { projectId: true },
      });
      if (!source) {
        return NextResponse.json({ error: 'Source not found' }, { status: 404 });
      }
      authorizedProjectId = source.projectId;
    } else {
      authorizedProjectId = shareLink.project.id;
    }

    // Verify the requested projectId matches
    if (projectId !== authorizedProjectId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const speakerNames = await prisma.speakerName.findMany({
      where: { projectId },
      select: {
        speakerId: true,
        customName: true,
      },
    });

    // Transform to a simple map
    const namesMap: Record<string, string> = {};
    for (const sn of speakerNames) {
      namesMap[sn.speakerId] = sn.customName;
    }

    return NextResponse.json({ speakerNames: namesMap });
  } catch (error) {
    console.error('Failed to fetch public speaker names:', error);
    return NextResponse.json({ error: 'Failed to fetch speaker names' }, { status: 500 });
  }
}
