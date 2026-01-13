import { NextResponse } from 'next/server';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { requireTenantAuth } from '@/lib/api/auth';
import { handleAPIError } from '@/lib/api/error-handler';
import { getWorkspacesForUser, createWorkspace } from '@/lib/db/tenant-queries/workspace-members';

const log = logger.child({ route: 'workspaces' });

/**
 * Validation schema for creating a workspace
 */
const createWorkspaceSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
});

/**
 * Generate a slug from a name
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50);
}

/**
 * GET /api/workspaces
 * Get all workspaces the current user is a member of
 */
export async function GET() {
  try {
    const { userId, schemaName } = await requireTenantAuth();

    const workspaces = await getWorkspacesForUser(schemaName, userId);

    return NextResponse.json(workspaces);
  } catch (error) {
    return handleAPIError(error, 'Failed to get workspaces');
  }
}

/**
 * POST /api/workspaces
 * Create a new workspace
 *
 * Body:
 * {
 *   name: string
 * }
 */
export async function POST(request: Request) {
  try {
    const { userId, schemaName } = await requireTenantAuth();

    const body = await request.json();

    // Validate request body
    const result = createWorkspaceSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid workspace data', details: result.error.issues },
        { status: 400 }
      );
    }

    const { name } = result.data;
    const slug = generateSlug(name);

    // Create workspace
    const workspace = await createWorkspace(schemaName, name, slug, userId);

    log.info({ userId, workspaceId: workspace.id }, 'Workspace created');

    return NextResponse.json(workspace);
  } catch (error) {
    return handleAPIError(error, 'Failed to create workspace');
  }
}
