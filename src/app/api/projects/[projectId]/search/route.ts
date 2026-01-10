import { NextResponse } from 'next/server';
import { z } from 'zod';
import { semanticSearch } from '@/lib/services/search.service';
import { requireAuth } from '@/lib/api/auth';
import { handleAPIError } from '@/lib/api/error-handler';
import { verifyProjectAccess } from '@/lib/api/permissions';

/**
 * Search request body schema
 */
const searchRequestSchema = z.object({
  query: z.string(),
  limit: z.number().int().min(1).max(100).optional().default(20),
  minSimilarity: z.number().min(0).max(1).optional().default(0.75),
});

/**
 * POST /api/projects/[projectId]/search
 *
 * Performs semantic search across transcript segments in a project.
 * Uses pgvector cosine similarity to find segments matching the query.
 *
 * Request body:
 * - query: string - Natural language search query
 * - limit?: number - Max results (default: 20, max: 100)
 * - minSimilarity?: number - Minimum similarity threshold (default: 0.75)
 *
 * Response:
 * - results: SearchResult[] - Ranked results with similarity scores
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { workspaceId } = await requireAuth();
    const { projectId } = await params;

    // Verify project access
    await verifyProjectAccess(projectId, workspaceId);

    // Parse and validate request body
    const body = await request.json();
    const parseResult = searchRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { query, limit, minSimilarity } = parseResult.data;

    // Perform semantic search
    const results = await semanticSearch({
      projectId,
      query,
      limit,
      minSimilarity,
    });

    return NextResponse.json({
      results,
      query,
      count: results.length,
    });
  } catch (error) {
    return handleAPIError(error, 'Failed to perform search');
  }
}
