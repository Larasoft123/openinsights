import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { workspaceAiSettingsSchema } from '@/lib/validations';
import {
  getWorkspaceSettingsForDisplay,
  updateWorkspaceAISettings,
} from '@/lib/services/workspace-settings.service';

const log = logger.child({ route: 'settings' });

/**
 * GET /api/settings
 * Get workspace AI settings for the current user
 * Returns masked API keys for security
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's current workspaceId from DB (more reliable than JWT)
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { workspaceId: true },
    });

    if (!user?.workspaceId) {
      return NextResponse.json({ error: 'No workspace assigned' }, { status: 403 });
    }

    const settings = await getWorkspaceSettingsForDisplay(user.workspaceId);

    if (!settings) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    return NextResponse.json(settings);
  } catch (error) {
    log.error({ error }, 'Failed to get settings');
    return NextResponse.json({ error: 'Failed to get settings' }, { status: 500 });
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
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's current workspaceId from DB
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { workspaceId: true },
    });

    if (!user?.workspaceId) {
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
    const updated = await updateWorkspaceAISettings(user.workspaceId, settings);

    log.info({ workspaceId: user.workspaceId }, 'Settings updated');

    return NextResponse.json(updated);
  } catch (error) {
    log.error({ error }, 'Failed to update settings');
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
