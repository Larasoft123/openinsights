import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { highlightSchema } from '@/lib/validations';
import { requireAuth } from '@/lib/api/auth';
import { handleAPIError } from '@/lib/api/error-handler';
import { verifySourceAccess } from '@/lib/api/permissions';

/**
 * POST /api/sources/[sourceId]/highlights
 *
 * Creates a new highlight linking a transcript segment to a tag.
 * Used by the Quick Tag popover in the Analysis Canvas.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ sourceId: string }> }
) {
  try {
    const { workspaceId } = await requireAuth();
    const { sourceId } = await params;

    // Verify source access
    await verifySourceAccess(sourceId, workspaceId);

    // Parse and validate request body
    const body = await request.json();
    const parseResult = highlightSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { segmentId, tagId, note } = parseResult.data;

    // Verify segment belongs to this source
    const segment = await prisma.transcriptSegment.findUnique({
      where: { id: segmentId },
      select: { sourceId: true },
    });

    if (!segment) {
      return NextResponse.json({ error: 'Segment not found' }, { status: 404 });
    }

    if (segment.sourceId !== sourceId) {
      return NextResponse.json(
        { error: 'Segment does not belong to this source' },
        { status: 400 }
      );
    }

    // Create highlight
    const highlight = await prisma.highlight.create({
      data: {
        segmentId,
        tagId,
        note: note || null,
      },
      include: {
        tag: true,
        segment: true,
      },
    });

    return NextResponse.json(highlight, { status: 201 });
  } catch (error) {
    return handleAPIError(error, 'Failed to create highlight');
  }
}

/**
 * GET /api/sources/[sourceId]/highlights
 *
 * Fetches all highlights for a source.
 */
export async function GET(request: Request, { params }: { params: Promise<{ sourceId: string }> }) {
  try {
    const { workspaceId } = await requireAuth();
    const { sourceId } = await params;

    // Verify source access
    await verifySourceAccess(sourceId, workspaceId);

    // Fetch highlights for all segments of this source
    const highlights = await prisma.highlight.findMany({
      where: {
        segment: {
          sourceId,
        },
      },
      include: {
        tag: true,
        segment: {
          select: {
            id: true,
            content: true,
            startTime: true,
            endTime: true,
          },
        },
      },
      orderBy: {
        segment: {
          startTime: 'asc',
        },
      },
    });

    return NextResponse.json(highlights);
  } catch (error) {
    return handleAPIError(error, 'Failed to fetch highlights');
  }
}
