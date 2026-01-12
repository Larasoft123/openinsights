import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { workspaceAiSettingsSchema } from '@/lib/validations';
import {
  getWorkspaceSettingsForDisplay,
  updateWorkspaceAISettings,
} from '@/lib/services/workspace-settings.service';
import { requireTenantAuth } from '@/lib/api/auth';
import { handleAPIError } from '@/lib/api/error-handler';
import { getWorkspaceByUserId } from '@/lib/db/tenant-queries';

const log = logger.child({ route: 'settings' });

/**
 * GET /api/settings
 * Get workspace AI settings for the current user
 * Returns masked API keys for security
 */
export async function GET() {
  try {
    const { schemaName, userId } = await requireTenantAuth();

    // Get workspace from tenant schema by user ID
    const workspace = await getWorkspaceByUserId(schemaName, userId);

    if (!workspace) {
      return NextResponse.json({ error: 'No workspace assigned' }, { status: 403 });
    }

    const settings = await getWorkspaceSettingsForDisplay(schemaName, workspace.id);

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
    const { schemaName, userId } = await requireTenantAuth();

    // Get workspace from tenant schema by user ID
    const workspace = await getWorkspaceByUserId(schemaName, userId);

    if (!workspace) {
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

    // Update workspace settings in tenant schema
    const updated = await updateWorkspaceAISettings(schemaName, workspace.id, settings);

    log.info({ workspaceId: workspace.id, schemaName }, 'Settings updated');

    return NextResponse.json(updated);
  } catch (error) {
    return handleAPIError(error, 'Failed to update settings');
  }
}
