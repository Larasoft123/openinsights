import { NextRequest, NextResponse } from 'next/server';
import { requireTenantAuth } from '@/lib/api/auth';
import { handleAPIError } from '@/lib/api/error-handler';
import {
  verifyProjectAccessTenant,
  listSpeakerNames,
  upsertSpeakerName,
  deleteSpeakerName,
} from '@/lib/db/tenant-queries';

interface RouteContext {
  params: Promise<{ projectId: string }>;
}

/**
 * GET /api/projects/[projectId]/speakers
 * Get all custom speaker names for a project
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { schemaName, workspaceId } = await requireTenantAuth();
    const { projectId } = await context.params;

    const project = await verifyProjectAccessTenant(schemaName, projectId, workspaceId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const speakerNames = await listSpeakerNames(schemaName, projectId);

    // Transform to a simple map for easy client-side usage
    const namesMap: Record<string, string> = {};
    for (const sn of speakerNames) {
      namesMap[sn.speakerId] = sn.customName;
    }

    return NextResponse.json({ speakerNames: namesMap });
  } catch (error) {
    return handleAPIError(error, 'Failed to fetch speaker names');
  }
}

/**
 * PUT /api/projects/[projectId]/speakers
 * Create or update a speaker name
 * Body: { speakerId: string, customName: string }
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { schemaName, workspaceId } = await requireTenantAuth();
    const { projectId } = await context.params;

    const project = await verifyProjectAccessTenant(schemaName, projectId, workspaceId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const { speakerId, customName } = await request.json();

    if (!speakerId || typeof speakerId !== 'string') {
      return NextResponse.json({ error: 'speakerId is required' }, { status: 400 });
    }

    // If customName is empty, delete the record
    if (!customName || customName.trim() === '') {
      await deleteSpeakerName(schemaName, projectId, speakerId);
      return NextResponse.json({ success: true, deleted: true });
    }

    // Upsert the speaker name
    const result = await upsertSpeakerName(schemaName, {
      projectId,
      speakerId,
      customName: customName.trim(),
    });

    return NextResponse.json({
      success: true,
      speakerName: {
        speakerId: result.speakerId,
        customName: result.customName,
      },
    });
  } catch (error) {
    return handleAPIError(error, 'Failed to update speaker name');
  }
}
