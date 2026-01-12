import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireTenantAuth } from '@/lib/api/auth';
import { handleAPIError } from '@/lib/api/error-handler';
import {
  verifyProjectAccessTenant,
  verifyThemeAccessTenant,
  getHighlightById,
  highlightThemeExists,
  addHighlightToTheme,
} from '@/lib/db/tenant-queries';

// Validation schemas
const addHighlightSchema = z.object({
  highlightId: z.string().min(1),
});

/**
 * POST /api/projects/[projectId]/themes/[themeId]/highlights
 * Add a highlight to a theme
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string; themeId: string }> }
) {
  try {
    const { schemaName, workspaceId } = await requireTenantAuth();
    const { projectId, themeId } = await params;

    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace assigned' }, { status: 403 });
    }

    // Verify project access
    const project = await verifyProjectAccessTenant(schemaName, projectId, workspaceId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Verify theme access
    const theme = await verifyThemeAccessTenant(schemaName, themeId, projectId);
    if (!theme) {
      return NextResponse.json({ error: 'Theme not found' }, { status: 404 });
    }

    const body = await request.json();

    // Validate request body
    const parseResult = addHighlightSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parseResult.error.issues },
        { status: 400 }
      );
    }

    const { highlightId } = parseResult.data;

    // Check highlight exists
    const highlight = await getHighlightById(schemaName, highlightId);
    if (!highlight) {
      return NextResponse.json({ error: 'Highlight not found' }, { status: 404 });
    }

    // Check if association already exists
    const exists = await highlightThemeExists(schemaName, highlightId, themeId);
    if (exists) {
      return NextResponse.json(
        { error: 'Highlight is already assigned to this theme' },
        { status: 400 }
      );
    }

    await addHighlightToTheme(schemaName, highlightId, themeId);

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    return handleAPIError(error, 'Failed to add highlight to theme');
  }
}
