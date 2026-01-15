/**
 * Integration Tests for Transcription Worker
 *
 * Tests the transcription worker's database operations using a real PostgreSQL database.
 * External dependencies (AI providers, storage, etc.) are mocked.
 *
 * Per CLAUDE.md: "do not use mocking for integration and e2e tests" for DB queries.
 * We mock only external APIs (transcription provider, S3, waveform generation).
 */

import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from 'vitest';
import { Job } from 'bullmq';
import {
  setupTestDatabase,
  teardownTestDatabase,
  clearTestData,
  testPool,
  testPrisma,
  TEST_SCHEMA,
} from '../setup';
import type { TranscriptionJobData } from '@/lib/queues/types';
import type { TranscriptionResult, AIProvider } from '@/lib/ai/types';

// Mock external dependencies BEFORE importing the worker
vi.mock('@/lib/ai', () => ({
  getTranscriptionProvider: vi.fn(() => ({
    name: 'mock-provider',
    transcribe: vi.fn(),
    embed: vi.fn(),
    supportsVideoInput: vi.fn(() => false),
    generateText: vi.fn(),
  })),
}));

vi.mock('@/lib/services/storage.service', () => ({
  downloadFile: vi.fn(() => Promise.resolve(Buffer.from('mock audio data'))),
  uploadFile: vi.fn(() => Promise.resolve()),
  getThumbnailKey: vi.fn((sourceId: string) => `thumbnails/${sourceId}.jpg`),
}));

vi.mock('@/lib/services/thumbnail.service', () => ({
  generateAudioWaveform: vi.fn(() => Promise.resolve()),
  killThumbnailProcess: vi.fn(),
}));

vi.mock('@/lib/services/organization-settings.service', () => ({
  getOrganizationAIConfig: vi.fn(() => Promise.resolve({ transcriptionProvider: 'deepgram' })),
  getDefaultOrganizationId: vi.fn(() => Promise.resolve('test-org')),
}));

vi.mock('@/lib/services/language-detection.service', () => ({
  getEffectiveLanguage: vi.fn(() => Promise.resolve({ language: 'en', detected: false })),
}));

// Mock the vectorization queue to prevent actual job queueing
vi.mock('@/lib/queues/index', () => ({
  vectorizationQueue: {
    add: vi.fn(() => Promise.resolve({ id: 'mock-vectorization-job' })),
  },
}));

// Import after mocks are set up
import { getTranscriptionProvider } from '@/lib/ai';
import { vectorizationQueue } from '@/lib/queues/index';
import { getEffectiveLanguage } from '@/lib/services/language-detection.service';

// Import tenant queries directly (not mocked - we test real DB operations)
import { getSourceById, listSegments } from '@/lib/db/tenant-queries';

/**
 * Create a complete mock AIProvider with all required properties
 */
function createMockTranscriptionProvider(transcribeImpl: ReturnType<typeof vi.fn>): AIProvider {
  return {
    name: 'mock-provider',
    transcribe: transcribeImpl,
    embed: vi.fn(),
    supportsVideoInput: vi.fn(() => false),
  } as AIProvider;
}

let dbAvailable = false;

// Test data holders
let testSourceId: string;
let testProjectId: string;
let testWorkspaceId: string;

describe('Transcription Worker Integration', () => {
  beforeAll(async () => {
    try {
      await setupTestDatabase();
      dbAvailable = true;
    } catch (error) {
      console.warn('Skipping integration tests: Database not available', error);
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
    vi.clearAllMocks();

    // Create test user and organization
    const user = await testPrisma.user.create({
      data: { email: 'test@example.com', name: 'Test User' },
    });

    await testPrisma.organization.upsert({
      where: { id: 'test-org' },
      update: {},
      create: {
        id: 'test-org',
        name: 'Test Organization',
        slug: 'test-org',
        schemaName: TEST_SCHEMA,
      },
    });

    // Create workspace, project, and source in tenant schema
    const client = await testPool.connect();
    try {
      await client.query(`SET search_path TO ${TEST_SCHEMA}, public`);

      const workspaceResult = await client.query(
        `INSERT INTO workspaces (name, slug) VALUES ($1, $2) RETURNING id`,
        ['Test Workspace', 'test-workspace']
      );
      testWorkspaceId = workspaceResult.rows[0].id;

      await client.query(
        `INSERT INTO workspace_members (workspace_id, user_id, role) VALUES ($1, $2, $3)`,
        [testWorkspaceId, user.id, 'owner']
      );

      const projectResult = await client.query(
        `INSERT INTO projects (workspace_id, name) VALUES ($1, $2) RETURNING id`,
        [testWorkspaceId, 'Test Project']
      );
      testProjectId = projectResult.rows[0].id;

      // Create source with PENDING status (like a real upload)
      const sourceResult = await client.query(
        `INSERT INTO sources (project_id, title, file_name, file_url, file_type, status)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [
          testProjectId,
          'Test Interview',
          'test-interview.mp3',
          'https://s3.example.com/test-interview.mp3',
          'audio/mpeg',
          'PENDING',
        ]
      );
      testSourceId = sourceResult.rows[0].id;

      await client.query('SET search_path TO public');
    } finally {
      client.release();
    }
  });

  describe('Segment Creation', () => {
    it('should create segments from transcription result', async () => {
      if (!dbAvailable) return;

      // Mock transcription result
      const mockTranscriptionResult: TranscriptionResult = {
        segments: [
          {
            content: 'Hello, this is the first segment.',
            startTime: 0,
            endTime: 5,
            speakerId: 'speaker_1',
          },
          {
            content: 'And this is the second segment.',
            startTime: 5,
            endTime: 10,
            speakerId: 'speaker_2',
          },
          { content: 'Final segment here.', startTime: 10, endTime: 15, speakerId: 'speaker_1' },
        ],
        duration: 15,
      };

      const mockProvider = createMockTranscriptionProvider(
        vi.fn().mockResolvedValue(mockTranscriptionResult)
      );
      vi.mocked(getTranscriptionProvider).mockReturnValue(mockProvider);

      // Import processJob dynamically to get fresh instance with mocks
      const { processTranscriptionJob } = await import('./transcription-test-helper');

      // Create mock job
      const mockJob = createMockJob({
        sourceId: testSourceId,
        fileUrl: 'https://s3.example.com/test.mp3',
        fileType: 'audio',
        schemaName: TEST_SCHEMA,
      });

      // Process the job
      await processTranscriptionJob(mockJob);

      // Verify segments were created in database
      const segments = await listSegments(TEST_SCHEMA, testSourceId);
      expect(segments).toHaveLength(3);
      expect(segments[0].content).toBe('Hello, this is the first segment.');
      expect(segments[0].startTime).toBe(0);
      expect(segments[0].endTime).toBe(5);
      expect(segments[0].speakerId).toBe('speaker_1');
      expect(segments[1].content).toBe('And this is the second segment.');
      expect(segments[2].content).toBe('Final segment here.');
    });

    it('should handle empty transcription result', async () => {
      if (!dbAvailable) return;

      const mockProvider = createMockTranscriptionProvider(
        vi.fn().mockResolvedValue({ segments: [], duration: 0 })
      );
      vi.mocked(getTranscriptionProvider).mockReturnValue(mockProvider);

      const { processTranscriptionJob } = await import('./transcription-test-helper');
      const mockJob = createMockJob({
        sourceId: testSourceId,
        fileUrl: 'https://s3.example.com/test.mp3',
        fileType: 'audio',
        schemaName: TEST_SCHEMA,
      });

      await processTranscriptionJob(mockJob);

      // Verify no segments created
      const segments = await listSegments(TEST_SCHEMA, testSourceId);
      expect(segments).toHaveLength(0);

      // Verify source marked as COMPLETED (no vectorization needed)
      const source = await getSourceById(TEST_SCHEMA, testSourceId);
      expect(source?.status).toBe('COMPLETED');
    });
  });

  describe('Source Status Updates', () => {
    it('should update source status through processing stages', async () => {
      if (!dbAvailable) return;

      const mockProvider = createMockTranscriptionProvider(
        vi.fn().mockResolvedValue({
          segments: [{ content: 'Test', startTime: 0, endTime: 5 }],
          duration: 5,
        })
      );
      vi.mocked(getTranscriptionProvider).mockReturnValue(mockProvider);

      const { processTranscriptionJob } = await import('./transcription-test-helper');
      const mockJob = createMockJob({
        sourceId: testSourceId,
        fileUrl: 'https://s3.example.com/test.mp3',
        fileType: 'audio',
        schemaName: TEST_SCHEMA,
      });

      await processTranscriptionJob(mockJob);

      // Verify source is in vectorizing step (waiting for vectorization worker)
      const source = await getSourceById(TEST_SCHEMA, testSourceId);
      expect(source?.processingStep).toBe('vectorizing');
      expect(source?.processingProgress).toBe(0);
    });

    it('should set source status to FAILED on error', async () => {
      if (!dbAvailable) return;

      const mockProvider = createMockTranscriptionProvider(
        vi.fn().mockRejectedValue(new Error('Transcription API error'))
      );
      vi.mocked(getTranscriptionProvider).mockReturnValue(mockProvider);

      const { processTranscriptionJob } = await import('./transcription-test-helper');
      const mockJob = createMockJob({
        sourceId: testSourceId,
        fileUrl: 'https://s3.example.com/test.mp3',
        fileType: 'audio',
        schemaName: TEST_SCHEMA,
      });

      await expect(processTranscriptionJob(mockJob)).rejects.toThrow('Transcription API error');

      // Verify source status is FAILED
      const source = await getSourceById(TEST_SCHEMA, testSourceId);
      expect(source?.status).toBe('FAILED');
    });
  });

  describe('Duration Tracking', () => {
    it('should update source duration from transcription result', async () => {
      if (!dbAvailable) return;

      const mockProvider = createMockTranscriptionProvider(
        vi.fn().mockResolvedValue({
          segments: [{ content: 'Test', startTime: 0, endTime: 120 }],
          duration: 120.5,
        })
      );
      vi.mocked(getTranscriptionProvider).mockReturnValue(mockProvider);

      const { processTranscriptionJob } = await import('./transcription-test-helper');
      const mockJob = createMockJob({
        sourceId: testSourceId,
        fileUrl: 'https://s3.example.com/test.mp3',
        fileType: 'audio',
        schemaName: TEST_SCHEMA,
      });

      await processTranscriptionJob(mockJob);

      // Verify duration was saved (rounded)
      const source = await getSourceById(TEST_SCHEMA, testSourceId);
      expect(source?.duration).toBe(121); // Rounded from 120.5
    });
  });

  describe('Language Detection', () => {
    it('should save detected language to source', async () => {
      if (!dbAvailable) return;

      // Mock language detection to return detected language
      vi.mocked(getEffectiveLanguage).mockResolvedValue({ language: 'es', detected: true });

      const mockProvider = createMockTranscriptionProvider(
        vi.fn().mockResolvedValue({
          segments: [{ content: 'Hola mundo', startTime: 0, endTime: 5 }],
          duration: 5,
        })
      );
      vi.mocked(getTranscriptionProvider).mockReturnValue(mockProvider);

      const { processTranscriptionJob } = await import('./transcription-test-helper');
      const mockJob = createMockJob({
        sourceId: testSourceId,
        fileUrl: 'https://s3.example.com/test.mp3',
        fileType: 'audio',
        schemaName: TEST_SCHEMA,
      });

      await processTranscriptionJob(mockJob);

      // Verify detected language was saved
      const source = await getSourceById(TEST_SCHEMA, testSourceId);
      expect(source?.detectedLanguage).toBe('es');
    });

    it('should not save language when not auto-detected', async () => {
      if (!dbAvailable) return;

      // Mock language detection to return non-detected language
      vi.mocked(getEffectiveLanguage).mockResolvedValue({ language: 'en', detected: false });

      const mockProvider = createMockTranscriptionProvider(
        vi.fn().mockResolvedValue({
          segments: [{ content: 'Hello world', startTime: 0, endTime: 5 }],
          duration: 5,
        })
      );
      vi.mocked(getTranscriptionProvider).mockReturnValue(mockProvider);

      const { processTranscriptionJob } = await import('./transcription-test-helper');
      const mockJob = createMockJob({
        sourceId: testSourceId,
        fileUrl: 'https://s3.example.com/test.mp3',
        fileType: 'audio',
        schemaName: TEST_SCHEMA,
      });

      await processTranscriptionJob(mockJob);

      // Verify detected language was NOT saved (should be null)
      const source = await getSourceById(TEST_SCHEMA, testSourceId);
      expect(source?.detectedLanguage).toBeNull();
    });
  });

  describe('Vectorization Queue', () => {
    it('should queue vectorization job with segment IDs', async () => {
      if (!dbAvailable) return;

      const mockProvider = createMockTranscriptionProvider(
        vi.fn().mockResolvedValue({
          segments: [
            { content: 'Segment 1', startTime: 0, endTime: 5 },
            { content: 'Segment 2', startTime: 5, endTime: 10 },
          ],
          duration: 10,
        })
      );
      vi.mocked(getTranscriptionProvider).mockReturnValue(mockProvider);

      const { processTranscriptionJob } = await import('./transcription-test-helper');
      const mockJob = createMockJob({
        sourceId: testSourceId,
        fileUrl: 'https://s3.example.com/test.mp3',
        fileType: 'audio',
        schemaName: TEST_SCHEMA,
      });

      await processTranscriptionJob(mockJob);

      // Verify vectorization job was queued
      expect(vectorizationQueue.add).toHaveBeenCalledWith(
        'vectorization',
        expect.objectContaining({
          sourceId: testSourceId,
          schemaName: TEST_SCHEMA,
          segmentIds: expect.arrayContaining([expect.any(String)]),
        }),
        expect.objectContaining({ jobId: `vectorization-${testSourceId}` })
      );

      // Verify correct number of segment IDs
      const callArgs = vi.mocked(vectorizationQueue.add).mock.calls[0][1];
      expect(callArgs.segmentIds).toHaveLength(2);
    });

    it('should not queue vectorization when no segments', async () => {
      if (!dbAvailable) return;

      const mockProvider = createMockTranscriptionProvider(
        vi.fn().mockResolvedValue({ segments: [], duration: 0 })
      );
      vi.mocked(getTranscriptionProvider).mockReturnValue(mockProvider);

      const { processTranscriptionJob } = await import('./transcription-test-helper');
      const mockJob = createMockJob({
        sourceId: testSourceId,
        fileUrl: 'https://s3.example.com/test.mp3',
        fileType: 'audio',
        schemaName: TEST_SCHEMA,
      });

      await processTranscriptionJob(mockJob);

      // Verify vectorization job was NOT queued
      expect(vectorizationQueue.add).not.toHaveBeenCalled();
    });
  });
});

/**
 * Create a mock BullMQ Job object for testing
 */
function createMockJob(data: TranscriptionJobData): Job<TranscriptionJobData> {
  return {
    id: 'test-job-id',
    data,
    updateProgress: vi.fn(),
    log: vi.fn(),
  } as unknown as Job<TranscriptionJobData>;
}
