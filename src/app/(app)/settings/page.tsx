import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getWorkspaceSettingsForDisplay } from '@/lib/services/workspace-settings.service';
import { prisma } from '@/lib/db';
import { AISettingsForm } from '@/components/settings/ai-settings-form';

export const metadata = {
  title: 'Settings - OpenInsights',
};

export default async function SettingsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  // Get user's workspace ID from DB
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { workspaceId: true },
  });

  if (!user?.workspaceId) {
    redirect('/login');
  }

  // Fetch current settings with masked keys
  const settings = await getWorkspaceSettingsForDisplay(user.workspaceId);

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Configure AI providers and API keys for your workspace
        </p>
      </div>

      <AISettingsForm
        initialSettings={{
          aiProvider: settings?.aiProvider ?? null,
          openaiTranscriptionModel: settings?.openaiTranscriptionModel ?? null,
          embeddingProvider: settings?.embeddingProvider ?? null,
          geminiApiKey: settings?.geminiApiKey ?? null,
          openaiApiKey: settings?.openaiApiKey ?? null,
          ollamaBaseUrl: settings?.ollamaBaseUrl ?? null,
          hasGeminiApiKey: settings?.hasGeminiApiKey ?? false,
          hasOpenaiApiKey: settings?.hasOpenaiApiKey ?? false,
        }}
      />
    </div>
  );
}
