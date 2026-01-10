import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/api/auth';
import { handleAPIError } from '@/lib/api/error-handler';
import { verifyProjectAccess } from '@/lib/api/permissions';

/**
 * GET /api/projects/[projectId]/highlights
 * Get all highlights for a project with optional filtering
 *
 * Query params:
 * - tagIds: comma-separated list of tag IDs to filter by
 * - sourceIds: comma-separated list of source IDs to filter by
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { workspaceId } = await requireAuth();
    const { projectId } = await params;

    // Verify project access
    await verifyProjectAccess(projectId, workspaceId);

    const { searchParams } = new URL(request.url);

    // Parse filter params
    const tagIdsParam = searchParams.get('tagIds');
    const sourceIdsParam = searchParams.get('sourceIds');

    const tagIds = tagIdsParam ? tagIdsParam.split(',').filter(Boolean) : undefined;
    const sourceIds = sourceIdsParam ? sourceIdsParam.split(',').filter(Boolean) : undefined;

    const highlights = await prisma.highlight.findMany({
      where: {
        segment: {
          source: {
            projectId,
            ...(sourceIds && sourceIds.length > 0 ? { id: { in: sourceIds } } : {}),
          },
        },
        ...(tagIds && tagIds.length > 0 ? { tagId: { in: tagIds } } : {}),
      },
      include: {
        tag: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
        segment: {
          select: {
            id: true,
            content: true,
            startTime: true,
            endTime: true,
            speakerId: true,
            source: {
              select: {
                id: true,
                title: true,
                fileUrl: true,
              },
            },
          },
        },
      },
      orderBy: [{ tag: { name: 'asc' } }, { segment: { startTime: 'asc' } }],
    });

    // Transform to a cleaner response shape
    const result = highlights.map((h) => ({
      id: h.id,
      note: h.note,
      createdAt: h.createdAt,
      tag: h.tag,
      segment: {
        id: h.segment.id,
        content: h.segment.content,
        startTime: h.segment.startTime,
        endTime: h.segment.endTime,
        speakerId: h.segment.speakerId,
      },
      source: h.segment.source,
    }));

    return NextResponse.json({ highlights: result });
  } catch (error) {
    return handleAPIError(error, 'Failed to get highlights');
  }
}
