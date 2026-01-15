import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { tagSchema } from '@/lib/validations';
import { requireTenantAuth } from '@/lib/api/auth';
import { handleAPIError } from '@/lib/api/error-handler';
import {
  verifyProjectAccessTenant,
  listTags,
  getTagByName,
  createTag,
} from '@/lib/db/tenant-queries';

const log = logger.child({ route: 'tags' });

/**
 * GET /api/projects/[projectId]/tags
 * Get all tags for a project with highlight counts
 */
export async function GET(
  _request: Request,
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

    const tags = await listTags(schemaName, projectId);

    const result = tags.map((tag) => ({
      id: tag.id,
      name: tag.name,
      color: tag.color,
      description: tag.description,
      highlightCount: tag._count?.highlights ?? 0,
    }));

    return NextResponse.json({ tags: result });
  } catch (error) {
    return handleAPIError(error, 'Failed to get tags');
  }
}

/**
 * POST /api/projects/[projectId]/tags
 * Create a new tag for a project
 *
 * Body: { name: string, color?: string, description?: string }
 */
export async function POST(
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

    const body = await request.json();

    // Validate request body
    const result = tagSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid tag data', details: result.error.issues },
        { status: 400 }
      );
    }

    const { name, color, description } = result.data;

    // Check for duplicate tag name in this project
    const existingTag = await getTagByName(schemaName, projectId, name);
    if (existingTag) {
      return NextResponse.json(
        { error: 'A tag with this name already exists in this project' },
        { status: 409 }
      );
    }

    // Create the tag
    const tag = await createTag(schemaName, {
      projectId,
      name,
      color: color ?? '#3B82F6',
      description,
    });

    log.info({ projectId, tagId: tag.id, tagName: tag.name }, 'Tag created');

    return NextResponse.json({
      id: tag.id,
      name: tag.name,
      color: tag.color,
      description: tag.description,
    });
  } catch (error) {
    return handleAPIError(error, 'Failed to create tag');
  }
}
