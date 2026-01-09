'use client';

import { useState } from 'react';
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

interface AISettingsFormProps {
  initialSettings: {
    aiProvider: string | null;
    openaiTranscriptionModel: string | null;
    embeddingProvider: string | null;
    geminiApiKey: string | null;
    openaiApiKey: string | null;
    ollamaBaseUrl: string | null;
    hasGeminiApiKey: boolean;
    hasOpenaiApiKey: boolean;
  };
}

// Special value to represent "use default (from environment)"
const USE_DEFAULT = '__default__';

export function AISettingsForm({ initialSettings }: AISettingsFormProps) {
  // Provider selections
  const [aiProvider, setAiProvider] = useState<string>(initialSettings.aiProvider ?? USE_DEFAULT);
  const [openaiTranscriptionModel, setOpenaiTranscriptionModel] = useState<string>(
    initialSettings.openaiTranscriptionModel ?? USE_DEFAULT
  );
  const [embeddingProvider, setEmbeddingProvider] = useState<string>(
    initialSettings.embeddingProvider ?? USE_DEFAULT
  );

  // API Keys - empty string means "don't change", user types new value to update
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [ollamaBaseUrl, setOllamaBaseUrl] = useState(initialSettings.ollamaBaseUrl ?? '');

  // Track if user wants to clear keys
  const [clearGeminiKey, setClearGeminiKey] = useState(false);
  const [clearOpenaiKey, setClearOpenaiKey] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    try {
      // Build the update payload
      const payload: Record<string, string | null | undefined> = {
        aiProvider: aiProvider === USE_DEFAULT ? null : aiProvider,
        openaiTranscriptionModel:
          openaiTranscriptionModel === USE_DEFAULT ? null : openaiTranscriptionModel,
        embeddingProvider: embeddingProvider === USE_DEFAULT ? null : embeddingProvider,
      };

      // Only include API keys if user made changes
      if (clearGeminiKey) {
        payload.geminiApiKey = null;
      } else if (geminiApiKey) {
        payload.geminiApiKey = geminiApiKey;
      }

      if (clearOpenaiKey) {
        payload.openaiApiKey = null;
      } else if (openaiApiKey) {
        payload.openaiApiKey = openaiApiKey;
      }

      // Always include Ollama URL (it's not sensitive)
      payload.ollamaBaseUrl = ollamaBaseUrl || null;

      const response = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save settings');
      }

      // Clear the key inputs after successful save
      setGeminiApiKey('');
      setOpenaiApiKey('');
      setClearGeminiKey(false);
      setClearOpenaiKey(false);

      setMessage({ type: 'success', text: 'Settings saved successfully' });

      // Reload to get updated masked keys
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

  const showOpenAIModel = aiProvider === 'openai';
  const needsGeminiKey = aiProvider === 'gemini' || embeddingProvider === 'gemini';
  const needsOpenAIKey = aiProvider === 'openai' || embeddingProvider === 'openai';
  const needsOllamaUrl = embeddingProvider === 'ollama';

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Provider Selection Card */}
      <Card>
        <CardHeader>
          <CardTitle>AI Providers</CardTitle>
          <CardDescription>
            Select which AI services to use for transcription and embeddings.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Transcription Provider */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Transcription Provider</label>
            <Select value={aiProvider} onValueChange={setAiProvider}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={USE_DEFAULT}>Use default (from environment)</SelectItem>
                <SelectItem value="gemini">Gemini (recommended for video)</SelectItem>
                <SelectItem value="openai">OpenAI Whisper</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-muted-foreground text-xs">
              Gemini can process video directly. OpenAI requires audio extraction first.
            </p>
          </div>

          {/* OpenAI Transcription Model (conditional) */}
          {showOpenAIModel && (
            <div className="space-y-2">
              <label className="text-sm font-medium">OpenAI Transcription Model</label>
              <Select value={openaiTranscriptionModel} onValueChange={setOpenaiTranscriptionModel}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={USE_DEFAULT}>Use default (from environment)</SelectItem>
                  <SelectItem value="whisper-1">Whisper-1 (classic)</SelectItem>
                  <SelectItem value="gpt-4o-transcribe-diarize">
                    GPT-4o Transcribe with Speaker Diarization
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-muted-foreground text-xs">
                GPT-4o Transcribe includes automatic speaker identification.
              </p>
            </div>
          )}

          {/* Embedding Provider */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Embedding Provider</label>
            <Select value={embeddingProvider} onValueChange={setEmbeddingProvider}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={USE_DEFAULT}>Use default (from environment)</SelectItem>
                <SelectItem value="openai">OpenAI (1536 dimensions)</SelectItem>
                <SelectItem value="gemini">Gemini (768 dimensions)</SelectItem>
                <SelectItem value="ollama">Ollama (768 dimensions, local)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-muted-foreground text-xs">Used for semantic search.</p>
          </div>
        </CardContent>
      </Card>

      {/* API Keys Card */}
      <Card>
        <CardHeader>
          <CardTitle>API Keys</CardTitle>
          <CardDescription>
            Configure your API keys. Keys are stored securely and never displayed in full.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Gemini API Key */}
          {needsGeminiKey && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Gemini API Key</label>
              {initialSettings.hasGeminiApiKey && !clearGeminiKey ? (
                <div className="flex gap-2">
                  <Input
                    value={initialSettings.geminiApiKey || ''}
                    disabled
                    className="font-mono text-sm"
                  />
                  <Button type="button" variant="outline" onClick={() => setClearGeminiKey(true)}>
                    Change
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Input
                    type="password"
                    value={geminiApiKey}
                    onChange={(e) => setGeminiApiKey(e.target.value)}
                    placeholder="Enter your Gemini API key"
                    className="font-mono text-sm"
                  />
                  {clearGeminiKey && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setClearGeminiKey(false);
                        setGeminiApiKey('');
                      }}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              )}
              <p className="text-muted-foreground text-xs">
                Get your key from{' '}
                <a
                  href="https://aistudio.google.com/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Google AI Studio
                </a>
              </p>
            </div>
          )}

          {/* OpenAI API Key */}
          {needsOpenAIKey && (
            <div className="space-y-2">
              <label className="text-sm font-medium">OpenAI API Key</label>
              {initialSettings.hasOpenaiApiKey && !clearOpenaiKey ? (
                <div className="flex gap-2">
                  <Input
                    value={initialSettings.openaiApiKey || ''}
                    disabled
                    className="font-mono text-sm"
                  />
                  <Button type="button" variant="outline" onClick={() => setClearOpenaiKey(true)}>
                    Change
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Input
                    type="password"
                    value={openaiApiKey}
                    onChange={(e) => setOpenaiApiKey(e.target.value)}
                    placeholder="Enter your OpenAI API key"
                    className="font-mono text-sm"
                  />
                  {clearOpenaiKey && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setClearOpenaiKey(false);
                        setOpenaiApiKey('');
                      }}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              )}
              <p className="text-muted-foreground text-xs">
                Get your key from{' '}
                <a
                  href="https://platform.openai.com/api-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  OpenAI Platform
                </a>
              </p>
            </div>
          )}

          {/* Ollama Base URL */}
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

          {!needsGeminiKey && !needsOpenAIKey && !needsOllamaUrl && (
            <p className="text-muted-foreground text-sm">
              Select a provider above to configure its API key.
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
