import { NextResponse } from 'next/server';
import { requireTenantAuth } from '@/lib/api/auth';
import { handleAPIError } from '@/lib/api/error-handler';
import { verifyProjectAccessTenant, listHighlights } from '@/lib/db/tenant-queries';

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
    const { schemaName, workspaceId } = await requireTenantAuth();
    const { projectId } = await params;

    // Verify project access
    const project = await verifyProjectAccessTenant(schemaName, projectId, workspaceId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);

    // Parse filter params
    const tagIdsParam = searchParams.get('tagIds');
    const sourceIdsParam = searchParams.get('sourceIds');

    const tagIds = tagIdsParam ? tagIdsParam.split(',').filter(Boolean) : undefined;
    const sourceIds = sourceIdsParam ? sourceIdsParam.split(',').filter(Boolean) : undefined;

    // Fetch highlights using tenant query
    const highlights = await listHighlights(schemaName, {
      projectId,
      tagIds,
      sourceId: sourceIds?.[0], // listHighlights uses sourceId, not sourceIds array
    });

    // Transform to response shape
    const result = highlights.map((h) => ({
      id: h.id,
      note: h.note,
      selectedText: h.selectedText,
      createdAt: h.createdAt,
      tag: h.tag,
      segment: {
        id: h.segment.id,
        content: h.segment.content,
        startTime: h.segment.startTime,
        endTime: h.segment.endTime,
        speakerId: h.segment.speakerId,
      },
      source: {
        id: h.source.id,
        title: h.source.title,
        fileUrl: h.source.fileUrl,
      },
    }));

    return NextResponse.json({ highlights: result });
  } catch (error) {
    return handleAPIError(error, 'Failed to get highlights');
  }
}
