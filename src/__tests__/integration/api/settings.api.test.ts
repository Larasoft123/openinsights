/**
 * Settings API - Integration Tests
 *
 * Tests the /api/settings endpoint for getting and updating
 * organization AI settings.
 * Run with: pnpm test src/__tests__/integration/api/settings.api.test.ts
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

// Mock organization-settings service
const mockGetOrganizationIdForUser = vi.fn();
const mockGetOrganizationSettingsForDisplay = vi.fn();
const mockUpdateOrganizationAISettings = vi.fn();

vi.mock('@/lib/services/organization-settings.service', () => ({
  getOrganizationIdForUser: mockGetOrganizationIdForUser,
  getOrganizationSettingsForDisplay: mockGetOrganizationSettingsForDisplay,
  updateOrganizationAISettings: mockUpdateOrganizationAISettings,
}));

// Check if database is available
let dbAvailable = false;

describe('Settings API', () => {
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

  describe('GET /api/settings', () => {
    it('should return 401 when not authenticated', async () => {
      if (!dbAvailable) return;

      setMockSession(null);

      const { GET } = await import('@/app/api/settings/route');

      const response = await GET();

      expect(response.status).toBe(401);
    });

    it('should return 403 when user has no organization', async () => {
      if (!dbAvailable) return;

      mockGetOrganizationIdForUser.mockResolvedValue(null);

      const { GET } = await import('@/app/api/settings/route');

      const response = await GET();

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toContain('No organization');
    });

    it('should return 404 when organization not found', async () => {
      if (!dbAvailable) return;

      mockGetOrganizationIdForUser.mockResolvedValue('test-org');
      mockGetOrganizationSettingsForDisplay.mockResolvedValue(null);

      const { GET } = await import('@/app/api/settings/route');

      const response = await GET();

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toContain('not found');
    });

    it('should return settings for authenticated user', async () => {
      if (!dbAvailable) return;

      const mockSettings = {
        transcriptionProvider: 'deepgram',
        hasDeepgramApiKey: true,
        hasAssemblyaiApiKey: false,
        whisperxEndpoint: null,
        embeddingProvider: 'openai',
        embeddingDimension: 1536,
        ollamaBaseUrl: null,
        generalAiProvider: 'gemini',
        transcriptionModel: 'nova-3',
        embeddingModel: 'text-embedding-3-small',
        generalAiModel: 'gemini-2.5-flash',
        openaiApiKey: null,
        geminiApiKey: null,
        hasOpenaiApiKey: true,
        hasGeminiApiKey: true,
      };

      mockGetOrganizationIdForUser.mockResolvedValue('test-org');
      mockGetOrganizationSettingsForDisplay.mockResolvedValue(mockSettings);

      const { GET } = await import('@/app/api/settings/route');

      const response = await GET();

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.transcriptionProvider).toBe('deepgram');
      expect(data.embeddingProvider).toBe('openai');
      expect(data.generalAiProvider).toBe('gemini');
      expect(data.hasDeepgramApiKey).toBe(true);
      expect(data.hasOpenaiApiKey).toBe(true);
      expect(data.hasGeminiApiKey).toBe(true);
    });
  });

  describe('PATCH /api/settings', () => {
    it('should return 401 when not authenticated', async () => {
      if (!dbAvailable) return;

      setMockSession(null);

      const { PATCH } = await import('@/app/api/settings/route');

      const request = new Request('http://localhost/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcriptionProvider: 'deepgram' }),
      });

      const response = await PATCH(request);

      expect(response.status).toBe(401);
    });

    it('should return 403 when user has no organization', async () => {
      if (!dbAvailable) return;

      mockGetOrganizationIdForUser.mockResolvedValue(null);

      const { PATCH } = await import('@/app/api/settings/route');

      const request = new Request('http://localhost/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcriptionProvider: 'deepgram' }),
      });

      const response = await PATCH(request);

      expect(response.status).toBe(403);
    });

    it('should return 400 for invalid provider', async () => {
      if (!dbAvailable) return;

      mockGetOrganizationIdForUser.mockResolvedValue('test-org');

      const { PATCH } = await import('@/app/api/settings/route');

      const request = new Request('http://localhost/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcriptionProvider: 'invalid-provider' }),
      });

      const response = await PATCH(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Invalid');
    });

    it('should update transcription provider', async () => {
      if (!dbAvailable) return;

      const updatedSettings = {
        transcriptionProvider: 'assemblyai',
        hasDeepgramApiKey: false,
        hasAssemblyaiApiKey: true,
      };

      mockGetOrganizationIdForUser.mockResolvedValue('test-org');
      mockUpdateOrganizationAISettings.mockResolvedValue(updatedSettings);

      const { PATCH } = await import('@/app/api/settings/route');

      const request = new Request('http://localhost/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcriptionProvider: 'assemblyai' }),
      });

      const response = await PATCH(request);

      expect(response.status).toBe(200);
      expect(mockUpdateOrganizationAISettings).toHaveBeenCalledWith(
        'test-org',
        expect.objectContaining({ transcriptionProvider: 'assemblyai' })
      );
    });

    it('should update embedding provider', async () => {
      if (!dbAvailable) return;

      const updatedSettings = {
        embeddingProvider: 'gemini',
        embeddingDimension: 768,
      };

      mockGetOrganizationIdForUser.mockResolvedValue('test-org');
      mockUpdateOrganizationAISettings.mockResolvedValue(updatedSettings);

      const { PATCH } = await import('@/app/api/settings/route');

      const request = new Request('http://localhost/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ embeddingProvider: 'gemini' }),
      });

      const response = await PATCH(request);

      expect(response.status).toBe(200);
      expect(mockUpdateOrganizationAISettings).toHaveBeenCalledWith(
        'test-org',
        expect.objectContaining({ embeddingProvider: 'gemini' })
      );
    });

    it('should update general AI provider', async () => {
      if (!dbAvailable) return;

      const updatedSettings = {
        generalAiProvider: 'openai',
      };

      mockGetOrganizationIdForUser.mockResolvedValue('test-org');
      mockUpdateOrganizationAISettings.mockResolvedValue(updatedSettings);

      const { PATCH } = await import('@/app/api/settings/route');

      const request = new Request('http://localhost/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ generalAiProvider: 'openai' }),
      });

      const response = await PATCH(request);

      expect(response.status).toBe(200);
      expect(mockUpdateOrganizationAISettings).toHaveBeenCalledWith(
        'test-org',
        expect.objectContaining({ generalAiProvider: 'openai' })
      );
    });

    it('should update model selections', async () => {
      if (!dbAvailable) return;

      const updatedSettings = {
        transcriptionModel: 'nova-2',
        embeddingModel: 'text-embedding-3-large',
        generalAiModel: 'gpt-4o',
      };

      mockGetOrganizationIdForUser.mockResolvedValue('test-org');
      mockUpdateOrganizationAISettings.mockResolvedValue(updatedSettings);

      const { PATCH } = await import('@/app/api/settings/route');

      const request = new Request('http://localhost/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcriptionModel: 'nova-2',
          embeddingModel: 'text-embedding-3-large',
          generalAiModel: 'gpt-4o',
        }),
      });

      const response = await PATCH(request);

      expect(response.status).toBe(200);
      expect(mockUpdateOrganizationAISettings).toHaveBeenCalledWith(
        'test-org',
        expect.objectContaining({
          transcriptionModel: 'nova-2',
          embeddingModel: 'text-embedding-3-large',
          generalAiModel: 'gpt-4o',
        })
      );
    });

    it('should update multiple settings at once', async () => {
      if (!dbAvailable) return;

      const updatedSettings = {
        transcriptionProvider: 'openai',
        embeddingProvider: 'openai',
        generalAiProvider: 'openai',
        transcriptionModel: 'gpt-4o-transcribe',
        embeddingModel: 'text-embedding-3-small',
        generalAiModel: 'gpt-4o-mini',
      };

      mockGetOrganizationIdForUser.mockResolvedValue('test-org');
      mockUpdateOrganizationAISettings.mockResolvedValue(updatedSettings);

      const { PATCH } = await import('@/app/api/settings/route');

      const request = new Request('http://localhost/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcriptionProvider: 'openai',
          embeddingProvider: 'openai',
          generalAiProvider: 'openai',
          transcriptionModel: 'gpt-4o-transcribe',
          embeddingModel: 'text-embedding-3-small',
          generalAiModel: 'gpt-4o-mini',
        }),
      });

      const response = await PATCH(request);

      expect(response.status).toBe(200);
    });
  });
});
