import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { organizationAiSettingsSchema } from '@/lib/validations';
import {
  getOrganizationSettingsForDisplay,
  updateOrganizationAISettings,
  getOrganizationIdForUser,
} from '@/lib/services/organization-settings.service';
import { requireTenantAuth } from '@/lib/api/auth';
import { handleAPIError } from '@/lib/api/error-handler';

const log = logger.child({ route: 'settings' });

/**
 * GET /api/settings
 * Get organization AI settings for the current user
 * Returns settings with masked API keys for security
 */
export async function GET() {
  try {
    const { userId } = await requireTenantAuth();

    // Get organization ID for user
    const organizationId = await getOrganizationIdForUser(userId);

    if (!organizationId) {
      return NextResponse.json({ error: 'No organization assigned' }, { status: 403 });
    }

    const settings = await getOrganizationSettingsForDisplay(organizationId);

    if (!settings) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    return NextResponse.json(settings);
  } catch (error) {
    return handleAPIError(error, 'Failed to get settings');
  }
}

/**
 * PATCH /api/settings
 * Update organization AI settings for the current user
 *
 * Body:
 * {
 *   // Transcription settings
 *   transcriptionProvider?: "deepgram" | "assemblyai" | "openai" | "whisperx" | null,
 *   deepgramApiKey?: string | null,
 *   assemblyaiApiKey?: string | null,
 *   whisperxEndpoint?: string | null,
 *
 *   // Embedding settings
 *   embeddingProvider?: "openai" | "gemini" | "ollama" | null,
 *   ollamaBaseUrl?: string | null,
 *
 *   // General AI settings
 *   generalAiProvider?: "gemini" | "openai" | null,
 *
 *   // Shared API keys (undefined = don't change, null/"" = clear)
 *   openaiApiKey?: string | null,
 *   geminiApiKey?: string | null,
 * }
 */
export async function PATCH(request: Request) {
  try {
    const { userId } = await requireTenantAuth();

    // Get organization ID for user
    const organizationId = await getOrganizationIdForUser(userId);

    if (!organizationId) {
      return NextResponse.json({ error: 'No organization assigned' }, { status: 403 });
    }

    const body = await request.json();

    // Validate request body
    const result = organizationAiSettingsSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid settings', details: result.error.issues },
        { status: 400 }
      );
    }

    const settings = result.data;

    // Update organization settings
    const updated = await updateOrganizationAISettings(organizationId, settings);

    log.info({ organizationId }, 'Organization AI settings updated');

    return NextResponse.json(updated);
  } catch (error) {
    return handleAPIError(error, 'Failed to update settings');
  }
}
