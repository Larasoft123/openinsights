import { NextResponse } from 'next/server';
import { requireTenantAuth } from '@/lib/api/auth';
import { handleAPIError } from '@/lib/api/error-handler';
import { listPresets, createPreset, type PresetCategory } from '@/lib/db/presets';
import { createPresetSchema, presetCategorySchema } from '@/lib/validations';

/**
 * GET /api/presets
 * List all presets visible to the current user.
 * Includes official presets and user's personal presets.
 *
 * Query params:
 *   - category: Filter by category (optional)
 *   - includeOfficial: Include official presets (default: true)
 */
export async function GET(request: Request) {
  try {
    const { userId } = await requireTenantAuth();

    // Parse query params
    const { searchParams } = new URL(request.url);
    const categoryParam = searchParams.get('category');
    const includeOfficialParam = searchParams.get('includeOfficial');

    // Validate category if provided
    let category: PresetCategory | undefined;
    if (categoryParam) {
      const categoryResult = presetCategorySchema.safeParse(categoryParam);
      if (!categoryResult.success) {
        return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
      }
      category = categoryResult.data;
    }

    const presets = await listPresets(userId, {
      category,
      includeOfficial: includeOfficialParam !== 'false',
    });

    return NextResponse.json({ presets });
  } catch (error) {
    return handleAPIError(error, 'Failed to fetch presets');
  }
}

/**
 * POST /api/presets
 * Create a new personal preset.
 */
export async function POST(request: Request) {
  try {
    const { userId } = await requireTenantAuth();

    const body = await request.json();
    const result = createPresetSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
    }

    const { name, description, category, config } = result.data;

    const preset = await createPreset({
      name,
      description,
      category,
      config,
      authorId: userId,
    });

    return NextResponse.json(preset, { status: 201 });
  } catch (error) {
    return handleAPIError(error, 'Failed to create preset');
  }
}
