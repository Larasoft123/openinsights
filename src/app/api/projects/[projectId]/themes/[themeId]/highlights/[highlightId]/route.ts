import { NextResponse } from 'next/server';
import { requireTenantAuth } from '@/lib/api/auth';
import { handleAPIError } from '@/lib/api/error-handler';
import {
  verifyProjectAccessTenant,
  verifyThemeAccessTenant,
  highlightThemeExists,
  removeHighlightFromTheme,
} from '@/lib/db/tenant-queries';

/**
 * DELETE /api/projects/[projectId]/themes/[themeId]/highlights/[highlightId]
 * Remove a highlight from a theme
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ projectId: string; themeId: string; highlightId: string }> }
) {
  try {
    const { schemaName, workspaceId } = await requireTenantAuth();
    const { projectId, themeId, highlightId } = await params;

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

    // Check if association exists
    const exists = await highlightThemeExists(schemaName, highlightId, themeId);
    if (!exists) {
      return NextResponse.json(
        { error: 'Highlight is not assigned to this theme' },
        { status: 404 }
      );
    }

    await removeHighlightFromTheme(schemaName, highlightId, themeId);

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleAPIError(error, 'Failed to remove highlight from theme');
  }
}
