/**
 * Integration Tests for Vectorization Worker
 *
 * Tests the vectorization worker's database operations using a real PostgreSQL database.
 * External dependencies (embedding provider) are mocked.
 *
 * Per CLAUDE.md: "do not use mocking for integration and e2e tests" for DB queries.
 * We mock only external APIs (embedding provider).
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
  TEST_EMBEDDING_DIMENSION,
  generateTestEmbedding,
} from '../setup';
import type { VectorizationJobData } from '@/lib/queues/types';
import type { AIProvider } from '@/lib/ai/types';

// Mock external dependencies BEFORE importing the worker
vi.mock('@/lib/ai', () => ({
  getEmbeddingProviderWithOrgConfig: vi.fn(() => ({
    name: 'mock-ollama',
    embed: vi.fn(),
    transcribe: vi.fn(),
    supportsVideoInput: vi.fn(() => false),
  })),
  getEmbeddingDimensionsFromOrgConfig: vi.fn(() => TEST_EMBEDDING_DIMENSION),
}));

vi.mock('@/lib/services/organization-settings.service', () => ({
  getOrganizationAIConfig: vi.fn(() => Promise.resolve({ embeddingProvider: 'ollama' })),
  getDefaultOrganizationId: vi.fn(() => Promise.resolve('test-org')),
}));

// Mock the summary generation queue to prevent actual job queueing
vi.mock('@/lib/queues/index', () => ({
  summaryGenerationQueue: {
    add: vi.fn(() => Promise.resolve({ id: 'mock-summary-job' })),
  },
}));

// Import after mocks are set up
import { getEmbeddingProviderWithOrgConfig } from '@/lib/ai';
import { summaryGenerationQueue } from '@/lib/queues/index';

// Import tenant queries directly (not mocked - we test real DB operations)
import { getSourceById } from '@/lib/db/tenant-queries';

/**
 * Create a complete mock AIProvider with all required properties for embedding
 */
function createMockEmbeddingProvider(embedImpl: ReturnType<typeof vi.fn>): AIProvider {
  return {
    name: 'mock-ollama',
    embed: embedImpl,
    transcribe: vi.fn(),
    supportsVideoInput: vi.fn(() => false),
  } as AIProvider;
}

let dbAvailable = false;

// Test data holders
let testSourceId: string;
let testProjectId: string;
let testWorkspaceId: string;
let testSegmentIds: string[];

describe('Vectorization Worker Integration', () => {
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
    testSegmentIds = [];

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

    // Create workspace, project, source, and segments in tenant schema
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

      // Create source with PROCESSING status (like after transcription)
      const sourceResult = await client.query(
        `INSERT INTO sources (project_id, title, file_name, file_url, file_type, status, processing_step)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [
          testProjectId,
          'Test Interview',
          'test-interview.mp3',
          'https://s3.example.com/test-interview.mp3',
          'audio/mpeg',
          'PROCESSING',
          'vectorizing',
        ]
      );
      testSourceId = sourceResult.rows[0].id;

      // Create test segments
      const segmentData = [
        { content: 'This is the first segment with some content.', startTime: 0, endTime: 5 },
        { content: 'Second segment has different content.', startTime: 5, endTime: 10 },
        { content: 'Third segment completes the test.', startTime: 10, endTime: 15 },
      ];

      for (const data of segmentData) {
        const result = await client.query(
          `INSERT INTO transcript_segments (source_id, content, start_time, end_time)
           VALUES ($1, $2, $3, $4) RETURNING id`,
          [testSourceId, data.content, data.startTime, data.endTime]
        );
        testSegmentIds.push(result.rows[0].id);
      }

      await client.query('SET search_path TO public');
    } finally {
      client.release();
    }
  });

  describe('Embedding Storage', () => {
    it('should store embeddings for all segments', async () => {
      if (!dbAvailable) return;

      // Mock embedding provider to return deterministic embeddings
      const mockProvider = createMockEmbeddingProvider(
        vi.fn().mockImplementation((texts: string[]) => ({
          embeddings: texts.map((_, i) => generateTestEmbedding(i + 1)),
        }))
      );
      vi.mocked(getEmbeddingProviderWithOrgConfig).mockReturnValue(mockProvider);

      const { processVectorizationJob } = await import('./vectorization-test-helper');
      const mockJob = createMockJob({
        sourceId: testSourceId,
        segmentIds: testSegmentIds,
        schemaName: TEST_SCHEMA,
      });

      await processVectorizationJob(mockJob);

      // Verify embeddings were stored
      const client = await testPool.connect();
      try {
        await client.query(`SET search_path TO ${TEST_SCHEMA}, public`);
        const result = await client.query(
          `SELECT id, embedding IS NOT NULL as has_embedding FROM transcript_segments WHERE id = ANY($1)`,
          [testSegmentIds]
        );
        await client.query('SET search_path TO public');

        expect(result.rows).toHaveLength(3);
        result.rows.forEach((row) => {
          expect(row.has_embedding).toBe(true);
        });
      } finally {
        client.release();
      }
    });

    it('should store embeddings with correct dimensions', async () => {
      if (!dbAvailable) return;

      const mockProvider = createMockEmbeddingProvider(
        vi.fn().mockImplementation((texts: string[]) => ({
          embeddings: texts.map((_, i) => generateTestEmbedding(i + 1)),
        }))
      );
      vi.mocked(getEmbeddingProviderWithOrgConfig).mockReturnValue(mockProvider);

      const { processVectorizationJob } = await import('./vectorization-test-helper');
      const mockJob = createMockJob({
        sourceId: testSourceId,
        segmentIds: testSegmentIds,
        schemaName: TEST_SCHEMA,
      });

      await processVectorizationJob(mockJob);

      // Verify embedding dimensions
      const client = await testPool.connect();
      try {
        await client.query(`SET search_path TO ${TEST_SCHEMA}, public`);
        const result = await client.query(
          `SELECT id, vector_dims(embedding) as dims FROM transcript_segments WHERE id = $1`,
          [testSegmentIds[0]]
        );
        await client.query('SET search_path TO public');

        expect(result.rows[0].dims).toBe(TEST_EMBEDDING_DIMENSION);
      } finally {
        client.release();
      }
    });
  });

  describe('Empty Segment Filtering', () => {
    it('should skip segments with empty content', async () => {
      if (!dbAvailable) return;

      // Add an empty segment
      const client = await testPool.connect();
      let emptySegmentId: string;
      try {
        await client.query(`SET search_path TO ${TEST_SCHEMA}, public`);
        const result = await client.query(
          `INSERT INTO transcript_segments (source_id, content, start_time, end_time)
           VALUES ($1, $2, $3, $4) RETURNING id`,
          [testSourceId, '   ', 15, 20] // Whitespace-only content
        );
        emptySegmentId = result.rows[0].id;
        await client.query('SET search_path TO public');
      } finally {
        client.release();
      }

      const allSegmentIds = [...testSegmentIds, emptySegmentId];

      const mockEmbed = vi.fn().mockImplementation((texts: string[]) => ({
        embeddings: texts.map((_, i) => generateTestEmbedding(i + 1)),
      }));
      const mockProvider = createMockEmbeddingProvider(mockEmbed);
      vi.mocked(getEmbeddingProviderWithOrgConfig).mockReturnValue(mockProvider);

      const { processVectorizationJob } = await import('./vectorization-test-helper');
      const mockJob = createMockJob({
        sourceId: testSourceId,
        segmentIds: allSegmentIds,
        schemaName: TEST_SCHEMA,
      });

      await processVectorizationJob(mockJob);

      // Verify embed was called only with non-empty content
      expect(mockEmbed).toHaveBeenCalledTimes(1);
      const embedCalls = mockEmbed.mock.calls[0][0];
      expect(embedCalls).toHaveLength(3); // Only 3 non-empty segments

      // Verify empty segment has no embedding
      const verifyClient = await testPool.connect();
      try {
        await verifyClient.query(`SET search_path TO ${TEST_SCHEMA}, public`);
        const result = await verifyClient.query(
          `SELECT embedding IS NOT NULL as has_embedding FROM transcript_segments WHERE id = $1`,
          [emptySegmentId]
        );
        await verifyClient.query('SET search_path TO public');

        expect(result.rows[0].has_embedding).toBe(false);
      } finally {
        verifyClient.release();
      }
    });
  });

  describe('Source Status Updates', () => {
    it('should mark source as COMPLETED after vectorization', async () => {
      if (!dbAvailable) return;

      const mockProvider = createMockEmbeddingProvider(
        vi.fn().mockImplementation((texts: string[]) => ({
          embeddings: texts.map((_, i) => generateTestEmbedding(i + 1)),
        }))
      );
      vi.mocked(getEmbeddingProviderWithOrgConfig).mockReturnValue(mockProvider);

      const { processVectorizationJob } = await import('./vectorization-test-helper');
      const mockJob = createMockJob({
        sourceId: testSourceId,
        segmentIds: testSegmentIds,
        schemaName: TEST_SCHEMA,
      });

      await processVectorizationJob(mockJob);

      // Verify source status
      const source = await getSourceById(TEST_SCHEMA, testSourceId);
      expect(source?.status).toBe('COMPLETED');
      expect(source?.processingStep).toBeNull();
      expect(source?.processingProgress).toBe(0);
      expect(source?.summaryStatus).toBe('PENDING');
    });

    it('should set source status to FAILED on error', async () => {
      if (!dbAvailable) return;

      const mockProvider = createMockEmbeddingProvider(
        vi.fn().mockRejectedValue(new Error('Embedding API error'))
      );
      vi.mocked(getEmbeddingProviderWithOrgConfig).mockReturnValue(mockProvider);

      const { processVectorizationJob } = await import('./vectorization-test-helper');
      const mockJob = createMockJob({
        sourceId: testSourceId,
        segmentIds: testSegmentIds,
        schemaName: TEST_SCHEMA,
      });

      await expect(processVectorizationJob(mockJob)).rejects.toThrow('Embedding API error');

      // Verify source status is FAILED
      const source = await getSourceById(TEST_SCHEMA, testSourceId);
      expect(source?.status).toBe('FAILED');
    });
  });

  describe('Summary Queue', () => {
    it('should queue summary generation after vectorization', async () => {
      if (!dbAvailable) return;

      const mockProvider = createMockEmbeddingProvider(
        vi.fn().mockImplementation((texts: string[]) => ({
          embeddings: texts.map((_, i) => generateTestEmbedding(i + 1)),
        }))
      );
      vi.mocked(getEmbeddingProviderWithOrgConfig).mockReturnValue(mockProvider);

      const { processVectorizationJob } = await import('./vectorization-test-helper');
      const mockJob = createMockJob({
        sourceId: testSourceId,
        segmentIds: testSegmentIds,
        schemaName: TEST_SCHEMA,
      });

      await processVectorizationJob(mockJob);

      // Verify summary job was queued
      expect(summaryGenerationQueue.add).toHaveBeenCalledWith(
        expect.stringContaining(`summary-source-${testSourceId}`),
        expect.objectContaining({
          sourceId: testSourceId,
          schemaName: TEST_SCHEMA,
        }),
        expect.any(Object)
      );
    });

    it('should skip summary generation when skipSummary is true', async () => {
      if (!dbAvailable) return;

      const mockProvider = createMockEmbeddingProvider(
        vi.fn().mockImplementation((texts: string[]) => ({
          embeddings: texts.map((_, i) => generateTestEmbedding(i + 1)),
        }))
      );
      vi.mocked(getEmbeddingProviderWithOrgConfig).mockReturnValue(mockProvider);

      const { processVectorizationJob } = await import('./vectorization-test-helper');
      const mockJob = createMockJob({
        sourceId: testSourceId,
        segmentIds: testSegmentIds,
        skipSummary: true,
        schemaName: TEST_SCHEMA,
      });

      await processVectorizationJob(mockJob);

      // The key behavior: summary job was NOT queued
      expect(summaryGenerationQueue.add).not.toHaveBeenCalled();

      // Source should still be marked COMPLETED
      const source = await getSourceById(TEST_SCHEMA, testSourceId);
      expect(source?.status).toBe('COMPLETED');
    });
  });

  describe('Batch Processing', () => {
    it('should process large number of segments in batches', async () => {
      if (!dbAvailable) return;

      // Create 60 segments (more than BATCH_SIZE of 50)
      const manySegmentIds: string[] = [];
      const client = await testPool.connect();
      try {
        await client.query(`SET search_path TO ${TEST_SCHEMA}, public`);
        for (let i = 0; i < 60; i++) {
          const result = await client.query(
            `INSERT INTO transcript_segments (source_id, content, start_time, end_time)
             VALUES ($1, $2, $3, $4) RETURNING id`,
            [testSourceId, `Segment number ${i + 1} with content.`, i * 5, (i + 1) * 5]
          );
          manySegmentIds.push(result.rows[0].id);
        }
        await client.query('SET search_path TO public');
      } finally {
        client.release();
      }

      const mockEmbed = vi.fn().mockImplementation((texts: string[]) => ({
        embeddings: texts.map((_, i) => generateTestEmbedding(i + 1)),
      }));
      const mockProvider = createMockEmbeddingProvider(mockEmbed);
      vi.mocked(getEmbeddingProviderWithOrgConfig).mockReturnValue(mockProvider);

      const { processVectorizationJob } = await import('./vectorization-test-helper');
      const mockJob = createMockJob({
        sourceId: testSourceId,
        segmentIds: manySegmentIds,
        schemaName: TEST_SCHEMA,
      });

      await processVectorizationJob(mockJob);

      // Verify embed was called twice (50 + 10)
      expect(mockEmbed).toHaveBeenCalledTimes(2);
      expect(mockEmbed.mock.calls[0][0]).toHaveLength(50);
      expect(mockEmbed.mock.calls[1][0]).toHaveLength(10);

      // Verify all embeddings were stored
      const verifyClient = await testPool.connect();
      try {
        await verifyClient.query(`SET search_path TO ${TEST_SCHEMA}, public`);
        const result = await verifyClient.query(
          `SELECT COUNT(*) as count FROM transcript_segments WHERE id = ANY($1) AND embedding IS NOT NULL`,
          [manySegmentIds]
        );
        await verifyClient.query('SET search_path TO public');

        expect(parseInt(result.rows[0].count)).toBe(60);
      } finally {
        verifyClient.release();
      }
    });
  });
});

/**
 * Create a mock BullMQ Job object for testing
 */
function createMockJob(data: VectorizationJobData): Job<VectorizationJobData> {
  return {
    id: 'test-job-id',
    data,
    updateProgress: vi.fn(),
    log: vi.fn(),
  } as unknown as Job<VectorizationJobData>;
}
