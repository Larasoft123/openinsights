import { NextResponse } from 'next/server';
import { requireTenantAuth } from '@/lib/api/auth';
import { handleAPIError } from '@/lib/api/error-handler';
import { verifySourceAccessTenant } from '@/lib/db/tenant-queries';
import {
  updateHighlight,
  deleteHighlight,
  getHighlightById,
} from '@/lib/db/tenant-queries/highlights';
import { getSegmentById } from '@/lib/db/tenant-queries/segments';
import { updateHighlightSchema } from '@/lib/validations';

/**
 * PATCH /api/sources/[sourceId]/highlights/[highlightId]
 *
 * Updates a highlight's note or selectedText.
 * Tag changes are handled by deleting old highlight and creating new one.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ sourceId: string; highlightId: string }> }
) {
  try {
    const { schemaName, workspaceId } = await requireTenantAuth();
    const { sourceId, highlightId } = await params;

    // Verify source access
    const source = await verifySourceAccessTenant(schemaName, sourceId, workspaceId);
    if (!source) {
      return NextResponse.json({ error: 'Source not found' }, { status: 404 });
    }

    // Verify highlight belongs to this source (via segment)
    const highlight = await getHighlightById(schemaName, highlightId);
    if (!highlight) {
      return NextResponse.json({ error: 'Highlight not found' }, { status: 404 });
    }

    // Check if highlight's segment belongs to this source
    const segment = await getSegmentById(schemaName, highlight.segmentId);
    if (!segment || segment.sourceId !== sourceId) {
      return NextResponse.json(
        { error: 'Highlight does not belong to this source' },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = updateHighlightSchema.parse(body);

    console.log('[DEBUG] PATCH highlight:', {
      highlightId,
      sourceId,
      updateData: validatedData,
    });

    // Update highlight
    const updatedHighlight = await updateHighlight(schemaName, highlightId, validatedData);

    if (!updatedHighlight) {
      console.error('[DEBUG] Failed to update highlight - no fields updated');
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    console.log('[DEBUG] Highlight updated successfully:', updatedHighlight);
    return NextResponse.json(updatedHighlight, { status: 200 });
  } catch (error) {
    return handleAPIError(error, 'Failed to update highlight');
  }
}

/**
 * DELETE /api/sources/[sourceId]/highlights/[highlightId]
 *
 * Deletes a highlight.
 * Used when user removes a tag from a segment.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ sourceId: string; highlightId: string }> }
) {
  try {
    const { schemaName, workspaceId } = await requireTenantAuth();
    const { sourceId, highlightId } = await params;

    // Verify source access
    const source = await verifySourceAccessTenant(schemaName, sourceId, workspaceId);
    if (!source) {
      return NextResponse.json({ error: 'Source not found' }, { status: 404 });
    }

    // Verify highlight belongs to this source (via segment)
    const highlight = await getHighlightById(schemaName, highlightId);
    if (!highlight) {
      return NextResponse.json({ error: 'Highlight not found' }, { status: 404 });
    }

    // Check if highlight's segment belongs to this source
    const segment = await getSegmentById(schemaName, highlight.segmentId);
    if (!segment || segment.sourceId !== sourceId) {
      return NextResponse.json(
        { error: 'Highlight does not belong to this source' },
        { status: 403 }
      );
    }

    console.log('[DEBUG] DELETE highlight:', { highlightId, sourceId });

    // Delete highlight
    const deleted = await deleteHighlight(schemaName, highlightId);

    if (!deleted) {
      console.error('[DEBUG] Failed to delete highlight');
      return NextResponse.json({ error: 'Failed to delete highlight' }, { status: 500 });
    }

    console.log('[DEBUG] Highlight deleted successfully');
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    return handleAPIError(error, 'Failed to delete highlight');
  }
}
