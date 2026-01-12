import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import {
  getOrganizationSettingsForDisplay,
  getOrganizationIdForUser,
} from '@/lib/services/organization-settings.service';
import { AISettingsForm } from '@/components/settings/ai-settings-form';

export const metadata = {
  title: 'Settings - OpenInsights',
};

export default async function SettingsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  const userId = session.user.id;

  // Get organization ID for user
  const organizationId = await getOrganizationIdForUser(userId);

  if (!organizationId) {
    redirect('/login');
  }

  // Fetch current settings with masked keys from organization
  const settings = await getOrganizationSettingsForDisplay(organizationId);

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Configure AI providers and API keys for your organization
        </p>
      </div>

      <AISettingsForm
        initialSettings={{
          // Transcription settings
          transcriptionProvider: settings?.transcriptionProvider ?? null,
          hasDeepgramApiKey: settings?.hasDeepgramApiKey ?? false,
          hasAssemblyaiApiKey: settings?.hasAssemblyaiApiKey ?? false,
          whisperxEndpoint: settings?.whisperxEndpoint ?? null,

          // Embedding settings
          embeddingProvider: settings?.embeddingProvider ?? null,
          embeddingDimension: settings?.embeddingDimension ?? 1536,
          ollamaBaseUrl: settings?.ollamaBaseUrl ?? null,

          // General AI settings
          generalAiProvider: settings?.generalAiProvider ?? null,

          // Model selection
          transcriptionModel: settings?.transcriptionModel ?? null,
          embeddingModel: settings?.embeddingModel ?? null,
          generalAiModel: settings?.generalAiModel ?? null,

          // Shared API keys (masked)
          openaiApiKey: settings?.openaiApiKey ?? null,
          geminiApiKey: settings?.geminiApiKey ?? null,
          hasOpenaiApiKey: settings?.hasOpenaiApiKey ?? false,
          hasGeminiApiKey: settings?.hasGeminiApiKey ?? false,
        }}
      />
    </div>
  );
}
