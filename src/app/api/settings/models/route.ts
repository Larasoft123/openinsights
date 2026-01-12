import { NextResponse } from 'next/server';
import { requireTenantAuth } from '@/lib/api/auth';
import { getOrganizationAIConfig } from '@/lib/services/organization-settings.service';
import { logger } from '@/lib/logger';

const log = logger.child({ route: 'settings-models' });

/**
 * Model info returned by the API
 */
interface ModelInfo {
  id: string;
  name: string;
  description?: string;
  dimensions?: number; // For embedding models
}

/**
 * Static model lists for providers without model listing APIs
 */
const DEEPGRAM_TRANSCRIPTION_MODELS: ModelInfo[] = [
  { id: 'nova-3', name: 'Nova 3', description: 'Latest, most accurate' },
  { id: 'nova-2', name: 'Nova 2', description: 'Previous generation' },
  { id: 'nova', name: 'Nova', description: 'First generation' },
  { id: 'enhanced', name: 'Enhanced', description: 'High accuracy' },
  { id: 'base', name: 'Base', description: 'Fast, lower accuracy' },
];

const WHISPERX_TRANSCRIPTION_MODELS: ModelInfo[] = [
  { id: 'large-v3', name: 'Large v3', description: 'Best accuracy, highest VRAM' },
  { id: 'large-v2', name: 'Large v2', description: 'Excellent accuracy' },
  { id: 'medium', name: 'Medium', description: 'Good balance' },
  { id: 'small', name: 'Small', description: 'Faster, less accurate' },
  { id: 'base', name: 'Base', description: 'Fast, basic accuracy' },
  { id: 'tiny', name: 'Tiny', description: 'Fastest, lowest accuracy' },
];

const OPENAI_TRANSCRIPTION_MODELS: ModelInfo[] = [
  {
    id: 'gpt-4o-transcribe',
    name: 'GPT-4o Transcribe',
    description: 'Recommended - supports diarization',
  },
  {
    id: 'whisper-1',
    name: 'Whisper',
    description: 'No diarization support',
  },
];

/**
 * Fetch OpenAI models
 */
async function fetchOpenAIModels(apiKey: string, task: string): Promise<ModelInfo[]> {
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!response.ok) {
      log.error({ status: response.status }, 'Failed to fetch OpenAI models');
      return getOpenAIFallbackModels(task);
    }

    const data = await response.json();
    const models: ModelInfo[] = [];

    for (const model of data.data || []) {
      const id = model.id as string;

      if (task === 'embeddings' && id.includes('embedding')) {
        models.push({
          id,
          name: formatModelName(id),
          dimensions: id.includes('3-small') ? 1536 : id.includes('3-large') ? 3072 : 1536,
        });
      } else if (task === 'general' && (id.startsWith('gpt-4') || id.startsWith('gpt-3'))) {
        // Filter to usable chat models
        if (
          id.includes('gpt-4o') ||
          id.includes('gpt-4-turbo') ||
          id === 'gpt-4' ||
          id === 'gpt-3.5-turbo'
        ) {
          models.push({ id, name: formatModelName(id) });
        }
      }
    }

    // Sort by name
    models.sort((a, b) => a.name.localeCompare(b.name));
    return models.length > 0 ? models : getOpenAIFallbackModels(task);
  } catch (error) {
    log.error({ error }, 'Error fetching OpenAI models');
    return getOpenAIFallbackModels(task);
  }
}

function getOpenAIFallbackModels(task: string): ModelInfo[] {
  if (task === 'embeddings') {
    return [
      { id: 'text-embedding-3-small', name: 'Text Embedding 3 Small', dimensions: 1536 },
      { id: 'text-embedding-3-large', name: 'Text Embedding 3 Large', dimensions: 3072 },
      { id: 'text-embedding-ada-002', name: 'Text Embedding Ada 002', dimensions: 1536 },
    ];
  }
  if (task === 'general') {
    return [
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: 'Fast and cost-effective' },
      { id: 'gpt-4o', name: 'GPT-4o', description: 'Most capable' },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', description: 'Previous flagship' },
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', description: 'Fast, economical' },
    ];
  }
  return OPENAI_TRANSCRIPTION_MODELS;
}

/**
 * Fetch Gemini models
 */
async function fetchGeminiModels(apiKey: string, task: string): Promise<ModelInfo[]> {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    );

    if (!response.ok) {
      log.error({ status: response.status }, 'Failed to fetch Gemini models');
      return getGeminiFallbackModels(task);
    }

    const data = await response.json();
    const models: ModelInfo[] = [];

    for (const model of data.models || []) {
      const name = model.name as string;
      const id = name.replace('models/', '');

      // Skip inappropriate models
      const displayName = (model.displayName || '') as string;
      const lowerName = displayName.toLowerCase();
      const lowerId = id.toLowerCase();

      // Exclusion list - skip these models
      const shouldExclude =
        lowerId.includes('preview') ||
        lowerId.includes('experimental') ||
        lowerId.includes('tts') ||
        lowerId.includes('image') ||
        lowerId.includes('vision') ||
        lowerId.includes('aqa') ||
        lowerId.includes('computer-use') ||
        lowerName.includes('preview') ||
        lowerName.includes('experimental') ||
        lowerName.includes('tts') ||
        lowerName.includes('banana') || // Test models
        lowerName.includes('image generation');

      if (shouldExclude) {
        continue;
      }

      if (task === 'embeddings' && id.includes('embedding')) {
        models.push({
          id,
          name: model.displayName || formatModelName(id),
          dimensions: 768,
        });
      } else if (task === 'general' && (id.includes('gemini-2') || id.includes('gemini-1'))) {
        // Filter to generative text models only
        if (!id.includes('embedding')) {
          models.push({
            id,
            name: model.displayName || formatModelName(id),
          });
        }
      }
    }

    // Sort by name
    models.sort((a, b) => a.name.localeCompare(b.name));
    return models.length > 0 ? models : getGeminiFallbackModels(task);
  } catch (error) {
    log.error({ error }, 'Error fetching Gemini models');
    return getGeminiFallbackModels(task);
  }
}

function getGeminiFallbackModels(task: string): ModelInfo[] {
  if (task === 'embeddings') {
    return [{ id: 'text-embedding-004', name: 'Text Embedding 004', dimensions: 768 }];
  }
  return [
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', description: 'Fast and capable' },
    { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', description: 'Previous generation' },
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', description: 'High capability' },
  ];
}

/**
 * Fetch Ollama models
 */
async function fetchOllamaModels(baseUrl: string): Promise<ModelInfo[]> {
  try {
    const response = await fetch(`${baseUrl}/api/tags`);

    if (!response.ok) {
      log.error({ status: response.status }, 'Failed to fetch Ollama models');
      return getOllamaFallbackModels();
    }

    const data = await response.json();
    const models: ModelInfo[] = [];

    for (const model of data.models || []) {
      const name = model.name as string;
      // Filter to embedding models
      if (name.includes('embed') || name.includes('nomic') || name.includes('mxbai')) {
        models.push({
          id: name,
          name: formatModelName(name),
          dimensions: 768,
        });
      }
    }

    return models.length > 0 ? models : getOllamaFallbackModels();
  } catch (error) {
    log.error({ error }, 'Error fetching Ollama models');
    return getOllamaFallbackModels();
  }
}

function getOllamaFallbackModels(): ModelInfo[] {
  return [
    { id: 'nomic-embed-text', name: 'Nomic Embed Text', dimensions: 768 },
    { id: 'mxbai-embed-large', name: 'MxBAI Embed Large', dimensions: 1024 },
  ];
}

/**
 * Format model ID to display name
 */
function formatModelName(id: string): string {
  return id
    .replace(/-/g, ' ')
    .replace(/_/g, ' ')
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * GET /api/settings/models
 *
 * Query parameters:
 * - provider: "openai" | "gemini" | "deepgram" | "whisperx" | "ollama" | "assemblyai"
 * - task: "transcription" | "embeddings" | "general"
 *
 * Returns: { models: ModelInfo[] }
 */
export async function GET(request: Request) {
  try {
    const auth = await requireTenantAuth();
    const { organizationId } = auth;

    const url = new URL(request.url);
    const searchParams = url.searchParams;
    const provider = searchParams.get('provider');
    const task = searchParams.get('task');

    if (!provider || !task) {
      return NextResponse.json(
        { error: 'Missing required parameters: provider, task' },
        { status: 400 }
      );
    }

    // Get organization config for API keys
    const config = await getOrganizationAIConfig(organizationId);

    let models: ModelInfo[] = [];

    switch (provider) {
      case 'openai':
        if (!config?.openaiApiKey) {
          return NextResponse.json(
            { error: 'OpenAI API key not configured', models: getOpenAIFallbackModels(task) },
            { status: 200 }
          );
        }
        models =
          task === 'transcription'
            ? OPENAI_TRANSCRIPTION_MODELS
            : await fetchOpenAIModels(config.openaiApiKey, task);
        break;

      case 'gemini':
        if (!config?.geminiApiKey) {
          return NextResponse.json(
            { error: 'Gemini API key not configured', models: getGeminiFallbackModels(task) },
            { status: 200 }
          );
        }
        models = await fetchGeminiModels(config.geminiApiKey, task);
        break;

      case 'deepgram':
        models = DEEPGRAM_TRANSCRIPTION_MODELS;
        break;

      case 'whisperx':
        models = WHISPERX_TRANSCRIPTION_MODELS;
        break;

      case 'ollama':
        if (!config?.ollamaBaseUrl) {
          return NextResponse.json(
            { error: 'Ollama URL not configured', models: getOllamaFallbackModels() },
            { status: 200 }
          );
        }
        models = await fetchOllamaModels(config.ollamaBaseUrl);
        break;

      case 'assemblyai':
        // AssemblyAI doesn't have selectable models - return empty to use provider default
        models = [];
        break;

      default:
        return NextResponse.json({ error: `Unknown provider: ${provider}` }, { status: 400 });
    }

    return NextResponse.json({ models });
  } catch (error) {
    log.error({ error }, 'Failed to fetch models');
    // Handle APIError from auth with proper status code
    if (error instanceof Error && 'status' in error) {
      const status = (error as { status: number }).status;
      return NextResponse.json({ error: error.message }, { status });
    }
    return NextResponse.json({ error: 'Failed to fetch models' }, { status: 500 });
  }
}
