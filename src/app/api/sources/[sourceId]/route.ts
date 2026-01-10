import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { idSchema } from '@/lib/validations';
import { requireAuth } from '@/lib/api/auth';
import { handleAPIError } from '@/lib/api/error-handler';
import { verifySourceAccess } from '@/lib/api/permissions';

/**
 * GET /api/sources/[sourceId]
 *
 * Fetches a source with all its transcript segments and project tags.
 * Used by the Analysis Canvas to render the video player and transcript.
 */
export async function GET(request: Request, { params }: { params: Promise<{ sourceId: string }> }) {
  try {
    const { workspaceId } = await requireAuth();
    const { sourceId } = await params;

    // Validate sourceId
    const parseResult = idSchema.safeParse(sourceId);
    if (!parseResult.success) {
      return NextResponse.json({ error: 'Invalid source ID' }, { status: 400 });
    }

    // Verify access
    await verifySourceAccess(sourceId, workspaceId);

    // Fetch source with segments and project tags
    const source = await prisma.source.findUnique({
      where: { id: sourceId },
      include: {
        segments: {
          orderBy: { startTime: 'asc' },
          include: {
            highlights: {
              include: {
                tag: true,
              },
            },
          },
        },
        project: {
          include: {
            tags: true,
            workspace: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(source);
  } catch (error) {
    return handleAPIError(error, 'Failed to fetch source');
  }
}
