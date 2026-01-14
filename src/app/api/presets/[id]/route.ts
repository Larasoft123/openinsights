import { NextResponse } from 'next/server';
import { requireTenantAuth } from '@/lib/api/auth';
import { handleAPIError } from '@/lib/api/error-handler';
import { getPresetById, updatePreset, deletePreset } from '@/lib/db/presets';
import { updatePresetSchema, idSchema } from '@/lib/validations';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/presets/[id]
 * Get a single preset by ID.
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { userId } = await requireTenantAuth();
    const { id } = await params;

    const idResult = idSchema.safeParse(id);
    if (!idResult.success) {
      return NextResponse.json({ error: 'Invalid preset ID' }, { status: 400 });
    }

    const preset = await getPresetById(id, userId);

    if (!preset) {
      return NextResponse.json({ error: 'Preset not found' }, { status: 404 });
    }

    return NextResponse.json(preset);
  } catch (error) {
    return handleAPIError(error, 'Failed to fetch preset');
  }
}

/**
 * PUT /api/presets/[id]
 * Update a preset.
 * Only the author can update their preset.
 */
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { userId } = await requireTenantAuth();
    const { id } = await params;

    const idResult = idSchema.safeParse(id);
    if (!idResult.success) {
      return NextResponse.json({ error: 'Invalid preset ID' }, { status: 400 });
    }

    const body = await request.json();
    const result = updatePresetSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
    }

    const preset = await updatePreset(id, userId, result.data);

    if (!preset) {
      return NextResponse.json(
        { error: 'Preset not found or you do not have permission to update it' },
        { status: 404 }
      );
    }

    return NextResponse.json(preset);
  } catch (error) {
    return handleAPIError(error, 'Failed to update preset');
  }
}

/**
 * DELETE /api/presets/[id]
 * Delete a preset.
 * Only the author can delete their preset.
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { userId } = await requireTenantAuth();
    const { id } = await params;

    const idResult = idSchema.safeParse(id);
    if (!idResult.success) {
      return NextResponse.json({ error: 'Invalid preset ID' }, { status: 400 });
    }

    const deleted = await deletePreset(id, userId);

    if (!deleted) {
      return NextResponse.json(
        { error: 'Preset not found or you do not have permission to delete it' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleAPIError(error, 'Failed to delete preset');
  }
}
