import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getPresignedUploadUrl, getSourceKey } from '@/lib/services/storage.service';
import { sourceFileTypes } from '@/lib/validations';

const log = logger.child({ route: 'sources' });

// Schema for creating a source
const createSourceSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  fileName: z.string().min(1).max(255),
  fileType: z.enum(sourceFileTypes),
  fileSize: z
    .number()
    .positive()
    .max(2 * 1024 * 1024 * 1024, 'File must be less than 2GB'),
});

/**
 * GET /api/projects/[projectId]/sources
 * List all sources for a project (used for polling)
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId } = await params;

    // Get user's current workspaceId from DB (more reliable than JWT which can be stale)
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { workspaceId: true },
    });

    if (!user?.workspaceId) {
      return NextResponse.json({ error: 'No workspace assigned' }, { status: 403 });
    }

    // Verify project belongs to user's workspace
    const project = await prisma.project.findFirst({
      where: { id: projectId, workspaceId: user.workspaceId },
      select: { id: true },
    });
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Fetch all sources for the project
    const sources = await prisma.source.findMany({
      where: { projectId },
      select: {
        id: true,
        title: true,
        fileName: true,
        fileType: true,
        status: true,
        duration: true,
        createdAt: true,
        updatedAt: true,
        // Progress tracking fields
        processingStep: true,
        processingProgress: true,
        processingStartedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      sources: sources.map((s) => ({
        ...s,
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
        processingStartedAt: s.processingStartedAt?.toISOString() ?? null,
      })),
    });
  } catch (error) {
    log.error({ error }, 'Failed to list sources');
    return NextResponse.json({ error: 'Failed to list sources' }, { status: 500 });
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
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId } = await params;

    // Get user's current workspaceId from DB (more reliable than JWT which can be stale)
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { workspaceId: true },
    });

    if (!user?.workspaceId) {
      log.warn({ userId: session.user.id }, 'User has no workspace assigned');
      return NextResponse.json({ error: 'No workspace assigned' }, { status: 403 });
    }

    // Verify project belongs to user's workspace
    const project = await prisma.project.findFirst({
      where: { id: projectId, workspaceId: user.workspaceId },
      select: { id: true },
    });
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Validate request body
    const body = await request.json();
    const parseResult = createSourceSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json({ error: parseResult.error.issues[0].message }, { status: 400 });
    }

    const { title, fileName, fileType } = parseResult.data;

    // Create source record with UPLOADING status
    const source = await prisma.source.create({
      data: {
        title,
        fileName,
        fileType,
        fileUrl: '', // Will be set after we have the key
        status: 'UPLOADING',
        projectId,
      },
    });

    // Generate S3 key and presigned upload URL
    const uploadKey = getSourceKey(source.id, fileName);
    const uploadUrl = await getPresignedUploadUrl(uploadKey, fileType, 3600);

    // Update source with the file URL (S3 key)
    await prisma.source.update({
      where: { id: source.id },
      data: { fileUrl: uploadKey },
    });

    log.info({ sourceId: source.id, projectId }, 'Source created, presigned URL generated');

    return NextResponse.json(
      {
        source: {
          id: source.id,
          title: source.title,
          fileName: source.fileName,
          fileType: source.fileType,
          status: source.status,
          createdAt: source.createdAt.toISOString(),
        },
        uploadUrl,
        expiresIn: 3600,
      },
      { status: 201 }
    );
  } catch (error) {
    log.error({ error }, 'Failed to create source');
    return NextResponse.json({ error: 'Failed to create source' }, { status: 500 });
  }
}
