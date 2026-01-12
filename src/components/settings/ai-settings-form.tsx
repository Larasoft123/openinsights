'use client';

import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { RefreshCw } from 'lucide-react';

/**
 * Model info returned by the API
 */
interface ModelInfo {
  id: string;
  name: string;
  description?: string;
  dimensions?: number;
}

/**
 * Props for the AI Settings Form
 * Matches the OrganizationSettingsResponse from the API
 */
interface AISettingsFormProps {
  initialSettings: {
    // Transcription settings
    transcriptionProvider: string | null;
    hasDeepgramApiKey: boolean;
    hasAssemblyaiApiKey: boolean;
    whisperxEndpoint: string | null;

    // Embedding settings
    embeddingProvider: string | null;
    embeddingDimension: number;
    ollamaBaseUrl: string | null;

    // General AI settings
    generalAiProvider: string | null;

    // Model selection
    transcriptionModel: string | null;
    embeddingModel: string | null;
    generalAiModel: string | null;

    // Shared API keys (masked)
    openaiApiKey: string | null;
    geminiApiKey: string | null;
    hasOpenaiApiKey: boolean;
    hasGeminiApiKey: boolean;
  };
}

// Transcription provider options
const TRANSCRIPTION_PROVIDERS = [
  { value: 'deepgram', label: 'Deepgram', description: 'Native diarization, excellent accuracy' },
  { value: 'assemblyai', label: 'AssemblyAI', description: 'High-accuracy diarization' },
  { value: 'openai', label: 'OpenAI Whisper', description: 'Industry-standard transcription' },
  { value: 'whisperx', label: 'WhisperX (Self-hosted)', description: 'Fully local, GPU required' },
];

// Embedding provider options
const EMBEDDING_PROVIDERS = [
  { value: 'openai', label: 'OpenAI', description: '1536 dimensions, best quality' },
  { value: 'gemini', label: 'Gemini', description: '768 dimensions' },
  { value: 'ollama', label: 'Ollama (Self-hosted)', description: '768 dimensions, fully local' },
];

// General AI provider options
const GENERAL_AI_PROVIDERS = [
  { value: 'gemini', label: 'Gemini', description: 'Good for summaries and analysis' },
  { value: 'openai', label: 'OpenAI', description: 'Alternative for text generation' },
];

export function AISettingsForm({ initialSettings }: AISettingsFormProps) {
  // Transcription settings
  const [transcriptionProvider, setTranscriptionProvider] = useState<string>(
    initialSettings.transcriptionProvider || 'deepgram'
  );
  const [deepgramApiKey, setDeepgramApiKey] = useState('');
  const [assemblyaiApiKey, setAssemblyaiApiKey] = useState('');
  const [whisperxEndpoint, setWhisperxEndpoint] = useState(initialSettings.whisperxEndpoint || '');

  // Embedding settings
  const [embeddingProvider, setEmbeddingProvider] = useState<string>(
    initialSettings.embeddingProvider || 'openai'
  );
  const [ollamaBaseUrl, setOllamaBaseUrl] = useState(initialSettings.ollamaBaseUrl || '');

  // General AI settings
  const [generalAiProvider, setGeneralAiProvider] = useState<string>(
    initialSettings.generalAiProvider || 'gemini'
  );

  // Model selection
  const [transcriptionModel, setTranscriptionModel] = useState<string>(
    initialSettings.transcriptionModel || ''
  );
  const [embeddingModel, setEmbeddingModel] = useState<string>(
    initialSettings.embeddingModel || ''
  );
  const [generalAiModel, setGeneralAiModel] = useState<string>(
    initialSettings.generalAiModel || ''
  );

  // Available models from API
  const [transcriptionModels, setTranscriptionModels] = useState<ModelInfo[]>([]);
  const [embeddingModels, setEmbeddingModels] = useState<ModelInfo[]>([]);
  const [generalAiModels, setGeneralAiModels] = useState<ModelInfo[]>([]);

  // Model loading states
  const [loadingTranscriptionModels, setLoadingTranscriptionModels] = useState(false);
  const [loadingEmbeddingModels, setLoadingEmbeddingModels] = useState(false);
  const [loadingGeneralAiModels, setLoadingGeneralAiModels] = useState(false);

  // Model fetch error states
  const [transcriptionModelsError, setTranscriptionModelsError] = useState<string | null>(null);
  const [embeddingModelsError, setEmbeddingModelsError] = useState<string | null>(null);
  const [generalAiModelsError, setGeneralAiModelsError] = useState<string | null>(null);

  // Shared API keys
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [geminiApiKey, setGeminiApiKey] = useState('');

  // Track key changes
  const [changeDeepgramKey, setChangeDeepgramKey] = useState(false);
  const [changeAssemblyaiKey, setChangeAssemblyaiKey] = useState(false);
  const [changeOpenaiKey, setChangeOpenaiKey] = useState(false);
  const [changeGeminiKey, setChangeGeminiKey] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Determine which API keys are needed
  const needsDeepgramKey = transcriptionProvider === 'deepgram';
  const needsAssemblyaiKey = transcriptionProvider === 'assemblyai';
  const needsWhisperxEndpoint = transcriptionProvider === 'whisperx';
  const needsOpenaiKey =
    transcriptionProvider === 'openai' ||
    embeddingProvider === 'openai' ||
    generalAiProvider === 'openai';
  const needsGeminiKey = embeddingProvider === 'gemini' || generalAiProvider === 'gemini';
  const needsOllamaUrl = embeddingProvider === 'ollama';

  // Fetch models from API
  const fetchModels = useCallback(
    async (
      provider: string,
      task: 'transcription' | 'embeddings' | 'general'
    ): Promise<{ models: ModelInfo[]; error: string | null }> => {
      try {
        const response = await fetch(`/api/settings/models?provider=${provider}&task=${task}`);
        const data = await response.json();

        if (!response.ok) {
          // API returned an error with models fallback
          return {
            models: data.models || [],
            error: data.error || 'Failed to fetch models',
          };
        }

        return { models: data.models || [], error: null };
      } catch (error) {
        console.error(`Failed to fetch ${task} models for ${provider}:`, error);
        return { models: [], error: 'Network error - could not fetch models' };
      }
    },
    []
  );

  const handleFetchTranscriptionModels = useCallback(async () => {
    setLoadingTranscriptionModels(true);
    setTranscriptionModelsError(null);
    const { models, error } = await fetchModels(transcriptionProvider, 'transcription');
    setTranscriptionModels(models);
    setTranscriptionModelsError(error);
    setLoadingTranscriptionModels(false);
  }, [transcriptionProvider, fetchModels]);

  const handleFetchEmbeddingModels = useCallback(async () => {
    setLoadingEmbeddingModels(true);
    setEmbeddingModelsError(null);
    const { models, error } = await fetchModels(embeddingProvider, 'embeddings');
    setEmbeddingModels(models);
    setEmbeddingModelsError(error);
    setLoadingEmbeddingModels(false);
  }, [embeddingProvider, fetchModels]);

  const handleFetchGeneralAiModels = useCallback(async () => {
    setLoadingGeneralAiModels(true);
    setGeneralAiModelsError(null);
    const { models, error } = await fetchModels(generalAiProvider, 'general');
    setGeneralAiModels(models);
    setGeneralAiModelsError(error);
    setLoadingGeneralAiModels(false);
  }, [generalAiProvider, fetchModels]);

  // Auto-fetch models on mount
  useEffect(() => {
    handleFetchTranscriptionModels();
    handleFetchEmbeddingModels();
    handleFetchGeneralAiModels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-fetch models when provider changes
  useEffect(() => {
    setTranscriptionModel(''); // Reset model selection
    handleFetchTranscriptionModels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transcriptionProvider]);

  useEffect(() => {
    setEmbeddingModel(''); // Reset model selection
    handleFetchEmbeddingModels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [embeddingProvider]);

  useEffect(() => {
    setGeneralAiModel(''); // Reset model selection
    handleFetchGeneralAiModels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generalAiProvider]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    try {
      // Build the update payload
      const payload: Record<string, string | null | undefined> = {
        transcriptionProvider,
        embeddingProvider,
        generalAiProvider,
        whisperxEndpoint: whisperxEndpoint || null,
        ollamaBaseUrl: ollamaBaseUrl || null,
        // Model selection (empty string means use default)
        transcriptionModel: transcriptionModel || null,
        embeddingModel: embeddingModel || null,
        generalAiModel: generalAiModel || null,
      };

      // Include API keys if:
      // 1. User clicked "Change" to modify existing key, OR
      // 2. No existing key and user entered a new value
      if (changeDeepgramKey || (!initialSettings.hasDeepgramApiKey && deepgramApiKey)) {
        payload.deepgramApiKey = deepgramApiKey || null;
      }
      if (changeAssemblyaiKey || (!initialSettings.hasAssemblyaiApiKey && assemblyaiApiKey)) {
        payload.assemblyaiApiKey = assemblyaiApiKey || null;
      }
      if (changeOpenaiKey || (!initialSettings.hasOpenaiApiKey && openaiApiKey)) {
        payload.openaiApiKey = openaiApiKey || null;
      }
      if (changeGeminiKey || (!initialSettings.hasGeminiApiKey && geminiApiKey)) {
        payload.geminiApiKey = geminiApiKey || null;
      }

      const response = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save settings');
      }

      // Reset key change flags
      setDeepgramApiKey('');
      setAssemblyaiApiKey('');
      setOpenaiApiKey('');
      setGeminiApiKey('');
      setChangeDeepgramKey(false);
      setChangeAssemblyaiKey(false);
      setChangeOpenaiKey(false);
      setChangeGeminiKey(false);

      setMessage({ type: 'success', text: 'Settings saved successfully' });

      // Reload to get updated data
      window.location.reload();
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to save settings',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Helper component for API key input
  const ApiKeyInput = ({
    label,
    hasKey,
    maskedValue,
    value,
    onChange,
    isChanging,
    onChangeClick,
    onCancel,
    placeholder,
    helpText,
    helpUrl,
  }: {
    label: string;
    hasKey: boolean;
    maskedValue: string | null;
    value: string;
    onChange: (v: string) => void;
    isChanging: boolean;
    onChangeClick: () => void;
    onCancel: () => void;
    placeholder: string;
    helpText: string;
    helpUrl: string;
  }) => (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      {hasKey && !isChanging ? (
        <div className="flex gap-2">
          <Input value={maskedValue || ''} disabled className="font-mono text-sm" />
          <Button type="button" variant="outline" onClick={onChangeClick}>
            Change
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <Input
            type="password"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="font-mono text-sm"
          />
          {isChanging && (
            <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </div>
      )}
      <p className="text-muted-foreground text-xs">
        {helpText}{' '}
        <a
          href={helpUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
        >
          Get API key
        </a>
      </p>
    </div>
  );

  // Helper component for model selection
  const ModelSelect = ({
    label,
    value,
    onChange,
    models,
    isLoading,
    onFetch,
    placeholder,
    helpText,
    error,
  }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    models: ModelInfo[];
    isLoading: boolean;
    onFetch: () => void;
    placeholder: string;
    helpText: string;
    error?: string | null;
  }) => (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      <div className="flex gap-2">
        <Select
          value={value || 'default'}
          onValueChange={(v) => onChange(v === 'default' ? '' : v)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default">
              <span className="text-muted-foreground">Use provider default</span>
            </SelectItem>
            {models.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                <span className="font-medium">{m.name}</span>
                {m.description && (
                  <span className="text-muted-foreground ml-2 text-xs">- {m.description}</span>
                )}
                {m.dimensions && (
                  <span className="text-muted-foreground ml-2 text-xs">({m.dimensions}d)</span>
                )}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={onFetch}
          disabled={isLoading}
          title="Fetch available models"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>
      {error ? (
        <p className="text-xs text-red-500">{error}</p>
      ) : (
        <p className="text-muted-foreground text-xs">{helpText}</p>
      )}
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Section 1: Transcription */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>Transcription (Speech-to-Text)</CardTitle>
            <Badge variant="outline">STT</Badge>
          </div>
          <CardDescription>
            Configure the provider for transcribing audio and video files with speaker
            identification.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Provider</label>
            <Select value={transcriptionProvider} onValueChange={setTranscriptionProvider}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select provider" />
              </SelectTrigger>
              <SelectContent>
                {TRANSCRIPTION_PROVIDERS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    <span className="font-medium">{p.label}</span>
                    <span className="text-muted-foreground ml-2 text-xs">- {p.description}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Model selection */}
          <ModelSelect
            label="Model"
            value={transcriptionModel}
            onChange={setTranscriptionModel}
            models={transcriptionModels}
            isLoading={loadingTranscriptionModels}
            onFetch={handleFetchTranscriptionModels}
            placeholder="Select model"
            helpText="Click refresh to load available models from the provider."
            error={transcriptionModelsError}
          />

          {/* Provider-specific API key */}
          {needsDeepgramKey && (
            <ApiKeyInput
              label="Deepgram API Key"
              hasKey={initialSettings.hasDeepgramApiKey}
              maskedValue={initialSettings.hasDeepgramApiKey ? '****...' : null}
              value={deepgramApiKey}
              onChange={setDeepgramApiKey}
              isChanging={changeDeepgramKey}
              onChangeClick={() => setChangeDeepgramKey(true)}
              onCancel={() => {
                setChangeDeepgramKey(false);
                setDeepgramApiKey('');
              }}
              placeholder="Enter your Deepgram API key"
              helpText="Get from Deepgram Console."
              helpUrl="https://console.deepgram.com"
            />
          )}

          {needsAssemblyaiKey && (
            <ApiKeyInput
              label="AssemblyAI API Key"
              hasKey={initialSettings.hasAssemblyaiApiKey}
              maskedValue={initialSettings.hasAssemblyaiApiKey ? '****...' : null}
              value={assemblyaiApiKey}
              onChange={setAssemblyaiApiKey}
              isChanging={changeAssemblyaiKey}
              onChangeClick={() => setChangeAssemblyaiKey(true)}
              onCancel={() => {
                setChangeAssemblyaiKey(false);
                setAssemblyaiApiKey('');
              }}
              placeholder="Enter your AssemblyAI API key"
              helpText="Get from AssemblyAI."
              helpUrl="https://www.assemblyai.com"
            />
          )}

          {needsWhisperxEndpoint && (
            <div className="space-y-2">
              <label className="text-sm font-medium">WhisperX Server URL</label>
              <Input
                type="url"
                value={whisperxEndpoint}
                onChange={(e) => setWhisperxEndpoint(e.target.value)}
                placeholder="http://localhost:9000"
                className="font-mono text-sm"
              />
              <p className="text-muted-foreground text-xs">
                URL of your self-hosted WhisperX server. Requires GPU.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 2: Embeddings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>Embeddings (Semantic Search)</CardTitle>
            <Badge variant="secondary">{initialSettings.embeddingDimension} dims</Badge>
          </div>
          <CardDescription>
            Configure the provider for generating embeddings used in semantic search.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Provider</label>
            <Select value={embeddingProvider} onValueChange={setEmbeddingProvider}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select provider" />
              </SelectTrigger>
              <SelectContent>
                {EMBEDDING_PROVIDERS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    <span className="font-medium">{p.label}</span>
                    <span className="text-muted-foreground ml-2 text-xs">- {p.description}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-muted-foreground text-xs">
              Changing embedding provider requires re-vectorizing all transcripts.
            </p>
          </div>

          {/* Model selection */}
          <ModelSelect
            label="Model"
            value={embeddingModel}
            onChange={setEmbeddingModel}
            models={embeddingModels}
            isLoading={loadingEmbeddingModels}
            onFetch={handleFetchEmbeddingModels}
            placeholder="Select model"
            helpText="Click refresh to load available models from the provider."
            error={embeddingModelsError}
          />

          {needsOllamaUrl && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Ollama Server URL</label>
              <Input
                type="url"
                value={ollamaBaseUrl}
                onChange={(e) => setOllamaBaseUrl(e.target.value)}
                placeholder="http://localhost:11434"
                className="font-mono text-sm"
              />
              <p className="text-muted-foreground text-xs">
                URL of your local Ollama server. Default: http://localhost:11434
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 3: General AI */}
      <Card>
        <CardHeader>
          <CardTitle>General AI (Summaries & Clustering)</CardTitle>
          <CardDescription>
            Configure the provider for AI summaries, theme clustering, and text generation.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Provider</label>
            <Select value={generalAiProvider} onValueChange={setGeneralAiProvider}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select provider" />
              </SelectTrigger>
              <SelectContent>
                {GENERAL_AI_PROVIDERS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    <span className="font-medium">{p.label}</span>
                    <span className="text-muted-foreground ml-2 text-xs">- {p.description}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Model selection */}
          <ModelSelect
            label="Model"
            value={generalAiModel}
            onChange={setGeneralAiModel}
            models={generalAiModels}
            isLoading={loadingGeneralAiModels}
            onFetch={handleFetchGeneralAiModels}
            placeholder="Select model"
            helpText="Click refresh to load available models from the provider."
            error={generalAiModelsError}
          />
        </CardContent>
      </Card>

      {/* Section 4: Shared API Keys */}
      <Card>
        <CardHeader>
          <CardTitle>Shared API Keys</CardTitle>
          <CardDescription>
            API keys used across multiple providers. Keys are encrypted and stored securely.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {needsOpenaiKey && (
            <ApiKeyInput
              label="OpenAI API Key"
              hasKey={initialSettings.hasOpenaiApiKey}
              maskedValue={initialSettings.openaiApiKey}
              value={openaiApiKey}
              onChange={setOpenaiApiKey}
              isChanging={changeOpenaiKey}
              onChangeClick={() => setChangeOpenaiKey(true)}
              onCancel={() => {
                setChangeOpenaiKey(false);
                setOpenaiApiKey('');
              }}
              placeholder="Enter your OpenAI API key"
              helpText="Used for transcription, embeddings, and/or general AI."
              helpUrl="https://platform.openai.com/api-keys"
            />
          )}

          {needsGeminiKey && (
            <ApiKeyInput
              label="Gemini API Key"
              hasKey={initialSettings.hasGeminiApiKey}
              maskedValue={initialSettings.geminiApiKey}
              value={geminiApiKey}
              onChange={setGeminiApiKey}
              isChanging={changeGeminiKey}
              onChangeClick={() => setChangeGeminiKey(true)}
              onCancel={() => {
                setChangeGeminiKey(false);
                setGeminiApiKey('');
              }}
              placeholder="Enter your Gemini API key"
              helpText="Used for embeddings and/or general AI."
              helpUrl="https://aistudio.google.com/apikey"
            />
          )}

          {!needsOpenaiKey && !needsGeminiKey && (
            <p className="text-muted-foreground text-sm">
              No shared API keys required for the selected providers.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Status message */}
      {message && (
        <div
          className={`rounded-md p-3 ${
            message.type === 'success'
              ? 'border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
              : 'border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
          }`}
        >
          <p
            className={`text-sm ${
              message.type === 'success'
                ? 'text-green-800 dark:text-green-200'
                : 'text-red-800 dark:text-red-200'
            }`}
          >
            {message.text}
          </p>
        </div>
      )}

      {/* Submit button */}
      <Button type="submit" disabled={isLoading}>
        {isLoading ? 'Saving...' : 'Save Settings'}
      </Button>
    </form>
  );
}
