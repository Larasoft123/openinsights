import { NextResponse } from 'next/server';
import { z } from 'zod';
import { semanticSearch, DEFAULT_MIN_SIMILARITY } from '@/lib/services/search.service';
import { requireTenantAuth } from '@/lib/api/auth';
import { handleAPIError } from '@/lib/api/error-handler';
import { verifyProjectAccessTenant } from '@/lib/db/tenant-queries';

/**
 * Search request body schema
 */
const searchRequestSchema = z.object({
  query: z.string(),
  limit: z.number().int().min(1).max(100).optional().default(20),
  minSimilarity: z.number().min(0).max(1).optional().default(DEFAULT_MIN_SIMILARITY),
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
 * - minSimilarity?: number - Minimum similarity threshold (default: DEFAULT_MIN_SIMILARITY)
 *
 * Response:
 * - results: SearchResult[] - Ranked results with similarity scores
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { schemaName, workspaceId, organizationId } = await requireTenantAuth();
    const { projectId } = await params;

    // Verify project access
    const project = await verifyProjectAccessTenant(schemaName, projectId, workspaceId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

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

    // Perform semantic search using Ollama embeddings
    const results = await semanticSearch({
      schemaName,
      organizationId,
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
