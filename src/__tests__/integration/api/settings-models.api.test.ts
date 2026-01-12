/**
 * Settings Models API - Integration Tests
 *
 * Tests the /api/settings/models endpoint that fetches available models
 * for different AI providers.
 * Run with: pnpm test src/__tests__/integration/api/settings-models.api.test.ts
 *
 * Requirements:
 * - Docker containers running (postgres with pgvector)
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import {
  testPrisma,
  setupTestDatabase,
  teardownTestDatabase,
  clearTestData,
  seedTestData,
  createMockSession,
  setMockSession,
  mockAuth,
  type TestSeedData,
} from '../setup';

// Mock the auth module before importing route handlers
vi.mock('@/lib/auth', () => ({
  auth: mockAuth,
}));

// Mock the database module to use test database
vi.mock('@/lib/db', () => ({
  prisma: testPrisma,
  default: testPrisma,
}));

// Mock organization-settings service to return test config
vi.mock('@/lib/services/organization-settings.service', () => ({
  getOrganizationAIConfig: vi.fn(),
  getOrganizationIdForUser: vi.fn(),
  getOrganizationSettingsForDisplay: vi.fn(),
}));

// Check if database is available
let dbAvailable = false;

describe('Settings Models API', () => {
  let testData: TestSeedData;

  beforeAll(async () => {
    try {
      await setupTestDatabase();
      dbAvailable = true;
    } catch {
      console.warn('Skipping integration tests: Database not available');
      console.warn('Run `docker compose up -d postgres` to enable these tests');
    }
  });

  afterAll(async () => {
    if (dbAvailable) {
      await teardownTestDatabase();
    }
  });

  beforeEach(async () => {
    if (!dbAvailable) return;

    await clearTestData();
    testData = await seedTestData();
    // Set the mock session with the test user
    setMockSession(createMockSession(testData));
    // Reset all mocks
    vi.resetAllMocks();
  });

  describe('GET /api/settings/models', () => {
    it('should return 401 when not authenticated', async () => {
      if (!dbAvailable) return;

      setMockSession(null);

      const { GET } = await import('@/app/api/settings/models/route');

      const request = new Request(
        'http://localhost/api/settings/models?provider=openai&task=general'
      );
      const response = await GET(request);

      expect(response.status).toBe(401);
    });

    it('should return 400 when provider parameter is missing', async () => {
      if (!dbAvailable) return;

      const { GET } = await import('@/app/api/settings/models/route');

      const request = new Request('http://localhost/api/settings/models?task=general');
      const response = await GET(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Missing required parameters');
    });

    it('should return 400 when task parameter is missing', async () => {
      if (!dbAvailable) return;

      const { GET } = await import('@/app/api/settings/models/route');

      const request = new Request('http://localhost/api/settings/models?provider=openai');
      const response = await GET(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Missing required parameters');
    });

    it('should return 400 for unknown provider', async () => {
      if (!dbAvailable) return;

      const { GET } = await import('@/app/api/settings/models/route');
      const { getOrganizationAIConfig } =
        await import('@/lib/services/organization-settings.service');
      vi.mocked(getOrganizationAIConfig).mockResolvedValue({});

      const request = new Request(
        'http://localhost/api/settings/models?provider=unknown&task=general'
      );
      const response = await GET(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Unknown provider');
    });

    describe('Deepgram provider', () => {
      it('should return static transcription models for Deepgram', async () => {
        if (!dbAvailable) return;

        const { GET } = await import('@/app/api/settings/models/route');
        const { getOrganizationAIConfig } =
          await import('@/lib/services/organization-settings.service');
        vi.mocked(getOrganizationAIConfig).mockResolvedValue({});

        const request = new Request(
          'http://localhost/api/settings/models?provider=deepgram&task=transcription'
        );
        const response = await GET(request);

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.models).toBeInstanceOf(Array);
        expect(data.models.length).toBeGreaterThan(0);
        // Verify expected Deepgram models
        const modelIds = data.models.map((m: { id: string }) => m.id);
        expect(modelIds).toContain('nova-3');
        expect(modelIds).toContain('nova-2');
      });
    });

    describe('WhisperX provider', () => {
      it('should return static transcription models for WhisperX', async () => {
        if (!dbAvailable) return;

        const { GET } = await import('@/app/api/settings/models/route');
        const { getOrganizationAIConfig } =
          await import('@/lib/services/organization-settings.service');
        vi.mocked(getOrganizationAIConfig).mockResolvedValue({});

        const request = new Request(
          'http://localhost/api/settings/models?provider=whisperx&task=transcription'
        );
        const response = await GET(request);

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.models).toBeInstanceOf(Array);
        expect(data.models.length).toBeGreaterThan(0);
        // Verify expected WhisperX models
        const modelIds = data.models.map((m: { id: string }) => m.id);
        expect(modelIds).toContain('large-v3');
        expect(modelIds).toContain('medium');
        expect(modelIds).toContain('tiny');
      });
    });

    describe('AssemblyAI provider', () => {
      it('should return empty models array for AssemblyAI', async () => {
        if (!dbAvailable) return;

        const { GET } = await import('@/app/api/settings/models/route');
        const { getOrganizationAIConfig } =
          await import('@/lib/services/organization-settings.service');
        vi.mocked(getOrganizationAIConfig).mockResolvedValue({});

        const request = new Request(
          'http://localhost/api/settings/models?provider=assemblyai&task=transcription'
        );
        const response = await GET(request);

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.models).toBeInstanceOf(Array);
        expect(data.models.length).toBe(0);
      });
    });

    describe('OpenAI provider', () => {
      it('should return fallback models when API key is not configured', async () => {
        if (!dbAvailable) return;

        const { GET } = await import('@/app/api/settings/models/route');
        const { getOrganizationAIConfig } =
          await import('@/lib/services/organization-settings.service');
        vi.mocked(getOrganizationAIConfig).mockResolvedValue({
          openaiApiKey: undefined,
        });

        const request = new Request(
          'http://localhost/api/settings/models?provider=openai&task=general'
        );
        const response = await GET(request);

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.models).toBeInstanceOf(Array);
        expect(data.error).toContain('API key not configured');
        // Should return fallback models
        const modelIds = data.models.map((m: { id: string }) => m.id);
        expect(modelIds).toContain('gpt-4o');
        expect(modelIds).toContain('gpt-4o-mini');
      });

      it('should return static transcription models for OpenAI', async () => {
        if (!dbAvailable) return;

        const { GET } = await import('@/app/api/settings/models/route');
        const { getOrganizationAIConfig } =
          await import('@/lib/services/organization-settings.service');
        vi.mocked(getOrganizationAIConfig).mockResolvedValue({
          openaiApiKey: 'test-key',
        });

        const request = new Request(
          'http://localhost/api/settings/models?provider=openai&task=transcription'
        );
        const response = await GET(request);

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.models).toBeInstanceOf(Array);
        // Verify expected OpenAI transcription models
        const modelIds = data.models.map((m: { id: string }) => m.id);
        expect(modelIds).toContain('gpt-4o-transcribe');
        expect(modelIds).toContain('whisper-1');
        // Verify diarization notes
        const whisperModel = data.models.find((m: { id: string }) => m.id === 'whisper-1');
        expect(whisperModel?.description).toContain('No diarization');
      });

      it('should return fallback embedding models when API key missing', async () => {
        if (!dbAvailable) return;

        const { GET } = await import('@/app/api/settings/models/route');
        const { getOrganizationAIConfig } =
          await import('@/lib/services/organization-settings.service');
        vi.mocked(getOrganizationAIConfig).mockResolvedValue({});

        const request = new Request(
          'http://localhost/api/settings/models?provider=openai&task=embeddings'
        );
        const response = await GET(request);

        expect(response.status).toBe(200);
        const data = await response.json();
        // Should return fallback embedding models
        const modelIds = data.models.map((m: { id: string }) => m.id);
        expect(modelIds).toContain('text-embedding-3-small');
        expect(modelIds).toContain('text-embedding-3-large');
      });
    });

    describe('Gemini provider', () => {
      it('should return fallback models when API key is not configured', async () => {
        if (!dbAvailable) return;

        const { GET } = await import('@/app/api/settings/models/route');
        const { getOrganizationAIConfig } =
          await import('@/lib/services/organization-settings.service');
        vi.mocked(getOrganizationAIConfig).mockResolvedValue({
          geminiApiKey: undefined,
        });

        const request = new Request(
          'http://localhost/api/settings/models?provider=gemini&task=general'
        );
        const response = await GET(request);

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.models).toBeInstanceOf(Array);
        expect(data.error).toContain('API key not configured');
        // Should return fallback models
        const modelIds = data.models.map((m: { id: string }) => m.id);
        expect(modelIds).toContain('gemini-2.5-flash');
      });

      it('should return fallback embedding model when API key is missing', async () => {
        if (!dbAvailable) return;

        const { GET } = await import('@/app/api/settings/models/route');
        const { getOrganizationAIConfig } =
          await import('@/lib/services/organization-settings.service');
        vi.mocked(getOrganizationAIConfig).mockResolvedValue({});

        const request = new Request(
          'http://localhost/api/settings/models?provider=gemini&task=embeddings'
        );
        const response = await GET(request);

        expect(response.status).toBe(200);
        const data = await response.json();
        // Should return fallback embedding models
        const modelIds = data.models.map((m: { id: string }) => m.id);
        expect(modelIds).toContain('text-embedding-004');
      });
    });

    describe('Ollama provider', () => {
      it('should return fallback models when URL is not configured', async () => {
        if (!dbAvailable) return;

        const { GET } = await import('@/app/api/settings/models/route');
        const { getOrganizationAIConfig } =
          await import('@/lib/services/organization-settings.service');
        vi.mocked(getOrganizationAIConfig).mockResolvedValue({
          ollamaBaseUrl: undefined,
        });

        const request = new Request(
          'http://localhost/api/settings/models?provider=ollama&task=embeddings'
        );
        const response = await GET(request);

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.models).toBeInstanceOf(Array);
        expect(data.error).toContain('URL not configured');
        // Should return fallback models
        const modelIds = data.models.map((m: { id: string }) => m.id);
        expect(modelIds).toContain('nomic-embed-text');
        expect(modelIds).toContain('mxbai-embed-large');
      });
    });
  });
});
