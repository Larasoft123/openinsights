import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import {
  getPresignedUploadUrl,
  getPresignedDownloadUrl,
  getSourceKey,
} from '@/lib/services/storage.service';
import { createSourceSchema } from '@/lib/validations';
import { requireTenantAuth, APIError } from '@/lib/api/auth';
import { handleAPIError } from '@/lib/api/error-handler';
import {
  listSourcesWithTags,
  createSource,
  updateSource,
  verifyProjectAccessTenant,
} from '@/lib/db/tenant-queries';

const log = logger.child({ route: 'sources' });

/**
 * GET /api/projects/[projectId]/sources
 * List all sources for a project (used for polling)
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { schemaName, workspaceId } = await requireTenantAuth();
    const { projectId } = await params;

    if (!workspaceId) {
      throw new APIError('No workspace assigned', 403);
    }

    // Verify project access
    const project = await verifyProjectAccessTenant(schemaName, projectId, workspaceId);
    if (!project) {
      throw new APIError('Project not found', 404);
    }

    // Fetch sources with aggregated tags
    const { sources, trashedCount } = await listSourcesWithTags(schemaName, projectId);

    // Transform dates to ISO strings and generate presigned URLs for thumbnails
    const sourcesWithFormattedDates = await Promise.all(
      sources.map(async (s) => {
        // Generate presigned URL for thumbnail if S3 key exists
        let thumbnailUrl = null;
        if (s.thumbnailUrl) {
          try {
            thumbnailUrl = await getPresignedDownloadUrl(s.thumbnailUrl, 3600); // 1 hour
          } catch {
            // Thumbnail may not exist yet or S3 error - use null
            thumbnailUrl = null;
          }
        }

        return {
          ...s,
          thumbnailUrl,
          createdAt: s.createdAt instanceof Date ? s.createdAt.toISOString() : s.createdAt,
          updatedAt: s.updatedAt instanceof Date ? s.updatedAt.toISOString() : s.updatedAt,
          processingStartedAt: s.processingStartedAt
            ? s.processingStartedAt instanceof Date
              ? s.processingStartedAt.toISOString()
              : s.processingStartedAt
            : null,
        };
      })
    );

    return NextResponse.json({
      sources: sourcesWithFormattedDates,
      trashedCount,
    });
  } catch (error) {
    return handleAPIError(error, 'Failed to list sources');
  }
}

/**
 * POST /api/projects/[projectId]/sources
 * Create a new source and return a presigned upload URL
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { schemaName, workspaceId } = await requireTenantAuth();
    const { projectId } = await params;

    if (!workspaceId) {
      throw new APIError('No workspace assigned', 403);
    }

    // Verify project access
    const project = await verifyProjectAccessTenant(schemaName, projectId, workspaceId);
    if (!project) {
      throw new APIError('Project not found', 404);
    }

    // Validate request body
    const body = await request.json();
    const parseResult = createSourceSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json({ error: parseResult.error.issues[0].message }, { status: 400 });
    }

    const { title, fileName, fileType } = parseResult.data;

    // Create source record with UPLOADING status
    const source = await createSource(schemaName, {
      projectId,
      title,
      fileName,
      fileUrl: '', // Will be set after we have the key
      fileType,
      status: 'UPLOADING',
    });

    // Generate S3 key and presigned upload URL
    const uploadKey = getSourceKey(source.id, fileName);
    const uploadUrl = await getPresignedUploadUrl(uploadKey, fileType, 3600);

    // Update source with the file URL (S3 key)
    await updateSource(schemaName, source.id, { fileUrl: uploadKey });

    log.info({ sourceId: source.id, projectId }, 'Source created, presigned URL generated');

    return NextResponse.json(
      {
        source: {
          id: source.id,
          title: source.title,
          fileName: source.fileName,
          fileType: source.fileType,
          status: source.status,
          createdAt:
            source.createdAt instanceof Date ? source.createdAt.toISOString() : source.createdAt,
        },
        uploadUrl,
        expiresIn: 3600,
      },
      { status: 201 }
    );
  } catch (error) {
    return handleAPIError(error, 'Failed to create source');
  }
}
