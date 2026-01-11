import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { workspaceAiSettingsSchema } from '@/lib/validations';
import {
  getWorkspaceSettingsForDisplay,
  updateWorkspaceAISettings,
} from '@/lib/services/workspace-settings.service';
import { requireTenantAuth } from '@/lib/api/auth';
import { handleAPIError } from '@/lib/api/error-handler';

const log = logger.child({ route: 'settings' });

/**
 * GET /api/settings
 * Get workspace AI settings for the current user
 * Returns masked API keys for security
 */
export async function GET() {
  try {
    const { workspaceId } = await requireTenantAuth();

    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace assigned' }, { status: 403 });
    }

    const settings = await getWorkspaceSettingsForDisplay(workspaceId);

    if (!settings) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    return NextResponse.json(settings);
  } catch (error) {
    return handleAPIError(error, 'Failed to get settings');
  }
}

/**
 * PATCH /api/settings
 * Update workspace AI settings for the current user
 *
 * Body:
 * {
 *   aiProvider?: "gemini" | "openai" | null,
 *   openaiTranscriptionModel?: "whisper-1" | "gpt-4o-transcribe-diarize" | null,
 *   embeddingProvider?: "openai" | "gemini" | "ollama" | null,
 *   geminiApiKey?: string | null,  // undefined = don't change, null/"" = clear
 *   openaiApiKey?: string | null,
 *   ollamaBaseUrl?: string | null
 * }
 */
export async function PATCH(request: Request) {
  try {
    const { workspaceId } = await requireTenantAuth();

    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace assigned' }, { status: 403 });
    }

    const body = await request.json();

    // Validate request body
    const result = workspaceAiSettingsSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid settings', details: result.error.issues },
        { status: 400 }
      );
    }

    const settings = result.data;

    // Update workspace settings
    const updated = await updateWorkspaceAISettings(workspaceId, settings);

    log.info({ workspaceId }, 'Settings updated');

    return NextResponse.json(updated);
  } catch (error) {
    return handleAPIError(error, 'Failed to update settings');
  }
}
