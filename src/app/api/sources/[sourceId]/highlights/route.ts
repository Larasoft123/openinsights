import { NextResponse } from 'next/server';
import { highlightSchema } from '@/lib/validations';
import { requireTenantAuth } from '@/lib/api/auth';
import { handleAPIError } from '@/lib/api/error-handler';
import {
  verifySourceAccessTenant,
  getSegmentById,
  createHighlightWithRelations,
  listHighlightsBySource,
} from '@/lib/db/tenant-queries';

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
    const { schemaName, workspaceId } = await requireTenantAuth();
    const { sourceId } = await params;

    // Verify source access
    const source = await verifySourceAccessTenant(schemaName, sourceId, workspaceId);
    if (!source) {
      return NextResponse.json({ error: 'Source not found' }, { status: 404 });
    }

    // Parse and validate request body
    const body = await request.json();
    const parseResult = highlightSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { segmentId, tagId, note, selectedText } = parseResult.data;

    // Verify segment belongs to this source
    const segment = await getSegmentById(schemaName, segmentId);

    if (!segment) {
      return NextResponse.json({ error: 'Segment not found' }, { status: 404 });
    }

    if (segment.sourceId !== sourceId) {
      return NextResponse.json(
        { error: 'Segment does not belong to this source' },
        { status: 400 }
      );
    }

    // Validate selectedText exists within segment content (if provided)
    if (selectedText && !segment.content.includes(selectedText)) {
      return NextResponse.json(
        { error: 'Selected text not found in segment content' },
        { status: 400 }
      );
    }

    // Create highlight with tag and segment included
    const highlight = await createHighlightWithRelations(schemaName, {
      segmentId,
      tagId,
      note: note || null,
      selectedText: selectedText || null,
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
    const { schemaName, workspaceId } = await requireTenantAuth();
    const { sourceId } = await params;

    // Verify source access
    const source = await verifySourceAccessTenant(schemaName, sourceId, workspaceId);
    if (!source) {
      return NextResponse.json({ error: 'Source not found' }, { status: 404 });
    }

    // Fetch highlights for all segments of this source
    const highlights = await listHighlightsBySource(schemaName, sourceId);

    return NextResponse.json(highlights);
  } catch (error) {
    return handleAPIError(error, 'Failed to fetch highlights');
  }
}
