/**
 * Organization Settings Service - Unit Tests
 *
 * Tests the organization AI settings service functions.
 * Run with: pnpm test src/__tests__/unit/services/organization-settings.service.test.ts
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Hoist mock functions to avoid initialization issues
const { mockFindUnique, mockFindFirst, mockUpdate, mockCreate, mockCount } = vi.hoisted(() => ({
  mockFindUnique: vi.fn(),
  mockFindFirst: vi.fn(),
  mockUpdate: vi.fn(),
  mockCreate: vi.fn(),
  mockCount: vi.fn(),
}));

const { mockEncryptApiKey, mockDecryptApiKey, mockMaskApiKey } = vi.hoisted(() => ({
  mockEncryptApiKey: vi.fn((key: string) => `encrypted:${key}`),
  mockDecryptApiKey: vi.fn((encrypted: string) => encrypted.replace('encrypted:', '')),
  mockMaskApiKey: vi.fn((key: string) => `${key.substring(0, 4)}...${key.slice(-4)}`),
}));

// Mock prisma client
vi.mock('@/lib/db', () => ({
  prisma: {
    organization: {
      findUnique: mockFindUnique,
      update: mockUpdate,
      create: mockCreate,
      count: mockCount,
    },
    organizationMember: {
      findFirst: mockFindFirst,
    },
  },
}));

// Mock crypto functions
vi.mock('@/lib/crypto/keys', () => ({
  encryptApiKey: mockEncryptApiKey,
  decryptApiKey: mockDecryptApiKey,
  maskApiKey: mockMaskApiKey,
}));

// Import service after mocking
import {
  getOrganizationAIConfig,
  getOrganizationSettingsForDisplay,
  updateOrganizationAISettings,
  getOrganizationIdForUser,
  getDefaultOrganizationId,
} from '@/lib/services/organization-settings.service';

describe('organization-settings.service', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // Re-apply default implementations after reset
    mockEncryptApiKey.mockImplementation((key: string) => `encrypted:${key}`);
    mockDecryptApiKey.mockImplementation((encrypted: string) =>
      encrypted.replace('encrypted:', '')
    );
    mockMaskApiKey.mockImplementation((key: string) => `${key.substring(0, 4)}...${key.slice(-4)}`);
  });

  describe('getOrganizationAIConfig', () => {
    it('should return null when organization not found', async () => {
      mockFindUnique.mockResolvedValue(null);

      const result = await getOrganizationAIConfig('non-existent-org');

      expect(result).toBeNull();
      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { id: 'non-existent-org' },
        select: expect.any(Object),
      });
    });

    it('should return config with decrypted API keys', async () => {
      mockFindUnique.mockResolvedValue({
        transcriptionProvider: 'deepgram',
        encryptedDeepgramKey: 'encrypted:deepgram-api-key',
        encryptedAssemblyaiKey: null,
        whisperxEndpoint: null,
        embeddingProvider: 'openai',
        embeddingDimension: 1536,
        ollamaBaseUrl: null,
        generalAiProvider: 'gemini',
        transcriptionModel: 'nova-3',
        embeddingModel: 'text-embedding-3-small',
        generalAiModel: 'gemini-2.5-flash',
        encryptedOpenaiKey: 'encrypted:openai-api-key',
        encryptedGeminiKey: 'encrypted:gemini-api-key',
      });

      const result = await getOrganizationAIConfig('test-org');

      expect(result).not.toBeNull();
      expect(result?.transcriptionProvider).toBe('deepgram');
      expect(result?.deepgramApiKey).toBe('deepgram-api-key');
      expect(result?.openaiApiKey).toBe('openai-api-key');
      expect(result?.geminiApiKey).toBe('gemini-api-key');
      expect(mockDecryptApiKey).toHaveBeenCalledWith('encrypted:deepgram-api-key');
      expect(mockDecryptApiKey).toHaveBeenCalledWith('encrypted:openai-api-key');
      expect(mockDecryptApiKey).toHaveBeenCalledWith('encrypted:gemini-api-key');
    });

    it('should return null for API keys that are not set', async () => {
      mockFindUnique.mockResolvedValue({
        transcriptionProvider: 'whisperx',
        encryptedDeepgramKey: null,
        encryptedAssemblyaiKey: null,
        whisperxEndpoint: 'http://localhost:9000',
        embeddingProvider: 'ollama',
        embeddingDimension: 768,
        ollamaBaseUrl: 'http://localhost:11434',
        generalAiProvider: null,
        transcriptionModel: null,
        embeddingModel: null,
        generalAiModel: null,
        encryptedOpenaiKey: null,
        encryptedGeminiKey: null,
      });

      const result = await getOrganizationAIConfig('test-org');

      expect(result).not.toBeNull();
      expect(result?.deepgramApiKey).toBeNull();
      expect(result?.assemblyaiApiKey).toBeNull();
      expect(result?.openaiApiKey).toBeNull();
      expect(result?.geminiApiKey).toBeNull();
      expect(result?.whisperxEndpoint).toBe('http://localhost:9000');
      expect(result?.ollamaBaseUrl).toBe('http://localhost:11434');
    });
  });

  describe('getOrganizationSettingsForDisplay', () => {
    it('should return null when organization not found', async () => {
      mockFindUnique.mockResolvedValue(null);

      const result = await getOrganizationSettingsForDisplay('non-existent-org');

      expect(result).toBeNull();
    });

    it('should return settings with masked API keys', async () => {
      mockFindUnique.mockResolvedValue({
        transcriptionProvider: 'deepgram',
        encryptedDeepgramKey: 'encrypted:deepgram-api-key',
        encryptedAssemblyaiKey: null,
        whisperxEndpoint: null,
        embeddingProvider: 'openai',
        embeddingDimension: 1536,
        ollamaBaseUrl: null,
        generalAiProvider: 'gemini',
        transcriptionModel: 'nova-3',
        embeddingModel: 'text-embedding-3-small',
        generalAiModel: 'gemini-2.5-flash',
        encryptedOpenaiKey: 'encrypted:openai-api-key-test',
        encryptedGeminiKey: 'encrypted:gemini-api-key-test',
      });

      const result = await getOrganizationSettingsForDisplay('test-org');

      expect(result).not.toBeNull();
      expect(result?.transcriptionProvider).toBe('deepgram');
      expect(result?.hasDeepgramApiKey).toBe(true);
      expect(result?.hasAssemblyaiApiKey).toBe(false);
      expect(result?.hasOpenaiApiKey).toBe(true);
      expect(result?.hasGeminiApiKey).toBe(true);
      // API keys should be masked
      expect(result?.openaiApiKey).toContain('...');
      expect(result?.geminiApiKey).toContain('...');
      expect(mockMaskApiKey).toHaveBeenCalled();
    });

    it('should return null masked keys when keys are not set', async () => {
      mockFindUnique.mockResolvedValue({
        transcriptionProvider: null,
        encryptedDeepgramKey: null,
        encryptedAssemblyaiKey: null,
        whisperxEndpoint: null,
        embeddingProvider: null,
        embeddingDimension: 1536,
        ollamaBaseUrl: null,
        generalAiProvider: null,
        transcriptionModel: null,
        embeddingModel: null,
        generalAiModel: null,
        encryptedOpenaiKey: null,
        encryptedGeminiKey: null,
      });

      const result = await getOrganizationSettingsForDisplay('test-org');

      expect(result).not.toBeNull();
      expect(result?.hasDeepgramApiKey).toBe(false);
      expect(result?.hasAssemblyaiApiKey).toBe(false);
      expect(result?.hasOpenaiApiKey).toBe(false);
      expect(result?.hasGeminiApiKey).toBe(false);
      expect(result?.openaiApiKey).toBeNull();
      expect(result?.geminiApiKey).toBeNull();
    });
  });

  describe('updateOrganizationAISettings', () => {
    beforeEach(() => {
      // Setup mock for getOrganizationSettingsForDisplay call after update
      mockFindUnique.mockResolvedValue({
        transcriptionProvider: 'deepgram',
        encryptedDeepgramKey: 'encrypted:new-key',
        encryptedAssemblyaiKey: null,
        whisperxEndpoint: null,
        embeddingProvider: 'openai',
        embeddingDimension: 1536,
        ollamaBaseUrl: null,
        generalAiProvider: 'gemini',
        transcriptionModel: 'nova-3',
        embeddingModel: null,
        generalAiModel: null,
        encryptedOpenaiKey: null,
        encryptedGeminiKey: null,
      });
      mockUpdate.mockResolvedValue({});
    });

    it('should update transcription provider', async () => {
      await updateOrganizationAISettings('test-org', {
        transcriptionProvider: 'assemblyai',
      });

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 'test-org' },
        data: expect.objectContaining({
          transcriptionProvider: 'assemblyai',
        }),
      });
    });

    it('should encrypt and store API keys', async () => {
      await updateOrganizationAISettings('test-org', {
        deepgramApiKey: 'new-deepgram-key',
        openaiApiKey: 'new-openai-key',
      });

      expect(mockEncryptApiKey).toHaveBeenCalledWith('new-deepgram-key');
      expect(mockEncryptApiKey).toHaveBeenCalledWith('new-openai-key');
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 'test-org' },
        data: expect.objectContaining({
          encryptedDeepgramKey: 'encrypted:new-deepgram-key',
          encryptedOpenaiKey: 'encrypted:new-openai-key',
        }),
      });
    });

    it('should clear API key when null is passed', async () => {
      await updateOrganizationAISettings('test-org', {
        deepgramApiKey: null,
      });

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 'test-org' },
        data: expect.objectContaining({
          encryptedDeepgramKey: null,
        }),
      });
    });

    it('should clear API key when empty string is passed', async () => {
      await updateOrganizationAISettings('test-org', {
        deepgramApiKey: '',
      });

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 'test-org' },
        data: expect.objectContaining({
          encryptedDeepgramKey: null,
        }),
      });
    });

    it('should not update API key when undefined', async () => {
      await updateOrganizationAISettings('test-org', {
        transcriptionProvider: 'deepgram',
        // deepgramApiKey not provided (undefined)
      });

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 'test-org' },
        data: {
          transcriptionProvider: 'deepgram',
        },
      });
    });

    it('should update model selection', async () => {
      await updateOrganizationAISettings('test-org', {
        transcriptionModel: 'nova-2',
        embeddingModel: 'text-embedding-3-large',
        generalAiModel: 'gpt-4o',
      });

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 'test-org' },
        data: expect.objectContaining({
          transcriptionModel: 'nova-2',
          embeddingModel: 'text-embedding-3-large',
          generalAiModel: 'gpt-4o',
        }),
      });
    });

    it('should clear model selection when null/empty is passed', async () => {
      await updateOrganizationAISettings('test-org', {
        transcriptionModel: null,
        embeddingModel: '',
      });

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 'test-org' },
        data: expect.objectContaining({
          transcriptionModel: null,
          embeddingModel: null,
        }),
      });
    });

    it('should return current settings when nothing to update', async () => {
      const result = await updateOrganizationAISettings('test-org', {});

      expect(mockUpdate).not.toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe('getOrganizationIdForUser', () => {
    it('should return organization ID from membership', async () => {
      mockFindFirst.mockResolvedValue({ organizationId: 'member-org-id' });

      const result = await getOrganizationIdForUser('user-123');

      expect(result).toBe('member-org-id');
      expect(mockFindFirst).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        select: { organizationId: true },
      });
    });

    it('should return default org when user has no membership', async () => {
      mockFindFirst.mockResolvedValue(null);
      mockFindUnique.mockResolvedValue({ id: 'default-org-id' });

      const result = await getOrganizationIdForUser('user-without-membership');

      expect(result).toBe('default-org-id');
    });

    it('should create default org if it does not exist', async () => {
      mockFindFirst.mockResolvedValue(null);
      mockFindUnique.mockResolvedValue(null);
      mockCreate.mockResolvedValue({ id: 'new-default-org-id' });

      const result = await getOrganizationIdForUser('user-without-membership');

      expect(result).toBe('new-default-org-id');
      expect(mockCreate).toHaveBeenCalledWith({
        data: {
          name: 'Default Organization',
          slug: 'default',
          schemaName: 'tenant_default',
        },
        select: { id: true },
      });
    });
  });

  describe('getDefaultOrganizationId', () => {
    it('should return existing default organization', async () => {
      mockFindUnique.mockResolvedValue({ id: 'existing-default-org' });

      const result = await getDefaultOrganizationId();

      expect(result).toBe('existing-default-org');
      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { slug: 'default' },
        select: { id: true },
      });
    });

    it('should create default organization if not exists', async () => {
      mockFindUnique.mockResolvedValue(null);
      mockCreate.mockResolvedValue({ id: 'created-default-org' });

      const result = await getDefaultOrganizationId();

      expect(result).toBe('created-default-org');
      expect(mockCreate).toHaveBeenCalledWith({
        data: {
          name: 'Default Organization',
          slug: 'default',
          schemaName: 'tenant_default',
        },
        select: { id: true },
      });
    });
  });
});
