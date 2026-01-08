import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { semanticSearch } from '@/lib/services/search.service';
import { idSchema } from '@/lib/validations';

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
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId } = await params;

    // Validate projectId
    const projectIdResult = idSchema.safeParse(projectId);
    if (!projectIdResult.success) {
      return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 });
    }

    // Verify project belongs to user's workspace
    const project = await prisma.project.findFirst({
      where: { id: projectId, workspaceId: session.user.workspaceId ?? undefined },
      select: { id: true },
    });
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
    console.error('Search API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
