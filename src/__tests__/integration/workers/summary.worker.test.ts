/**
 * Integration Tests for Summary Generation Worker
 *
 * Tests the summary worker's database operations using a real PostgreSQL database.
 * External dependencies (AI provider) are mocked.
 *
 * Per CLAUDE.md: "do not use mocking for integration and e2e tests" for DB queries.
 * We mock only external APIs (general AI provider).
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
import type { SummaryGenerationJobData } from '@/lib/queues/types';
import type { AIProvider } from '@/lib/ai/types';

// Mock external dependencies BEFORE importing
vi.mock('@/lib/ai', () => ({
  getGeneralAIProvider: vi.fn(() => ({
    name: 'mock-gemini',
    generateText: vi.fn(),
    transcribe: vi.fn(),
    embed: vi.fn(),
    supportsVideoInput: vi.fn(() => false),
  })),
}));

vi.mock('@/lib/services/organization-settings.service', () => ({
  getOrganizationAIConfig: vi.fn(() => Promise.resolve({ generalAiProvider: 'gemini' })),
  getDefaultOrganizationId: vi.fn(() => Promise.resolve('test-org')),
}));

// Import after mocks are set up
import { getGeneralAIProvider } from '@/lib/ai';

// Import tenant queries directly (not mocked - we test real DB operations)
import { getSourceById, getProjectById } from '@/lib/db/tenant-queries';

/**
 * Create a complete mock AIProvider with all required properties for summary generation
 */
function createMockGeneralAIProvider(generateTextImpl: ReturnType<typeof vi.fn>): AIProvider {
  return {
    name: 'mock-gemini',
    generateText: generateTextImpl,
    transcribe: vi.fn(),
    embed: vi.fn(),
    supportsVideoInput: vi.fn(() => false),
  } as AIProvider;
}

let dbAvailable = false;

// Test data holders
let testSourceId: string;
let testProjectId: string;
let testWorkspaceId: string;

describe('Summary Generation Worker Integration', () => {
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
        `INSERT INTO projects (workspace_id, name, description) VALUES ($1, $2, $3) RETURNING id`,
        [testWorkspaceId, 'Test Project', 'A project for testing summaries']
      );
      testProjectId = projectResult.rows[0].id;

      // Create source with COMPLETED status and PENDING summary
      const sourceResult = await client.query(
        `INSERT INTO sources (project_id, title, file_name, file_url, file_type, status, duration, summary_status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
        [
          testProjectId,
          'Test Interview',
          'test-interview.mp3',
          'https://s3.example.com/test-interview.mp3',
          'audio/mpeg',
          'COMPLETED',
          300,
          'PENDING',
        ]
      );
      testSourceId = sourceResult.rows[0].id;

      // Create test segments
      const segmentData = [
        {
          content: 'I think the current checkout process is confusing.',
          startTime: 0,
          endTime: 5,
          speakerId: 'speaker_1',
        },
        {
          content: 'Can you tell me more about what confuses you?',
          startTime: 5,
          endTime: 10,
          speakerId: 'speaker_2',
        },
        {
          content: 'Well, the payment options are not clear at all.',
          startTime: 10,
          endTime: 15,
          speakerId: 'speaker_1',
        },
      ];

      for (const data of segmentData) {
        await client.query(
          `INSERT INTO transcript_segments (source_id, content, start_time, end_time, speaker_id)
           VALUES ($1, $2, $3, $4, $5)`,
          [testSourceId, data.content, data.startTime, data.endTime, data.speakerId]
        );
      }

      await client.query('SET search_path TO public');
    } finally {
      client.release();
    }
  });

  describe('Source Summary Generation', () => {
    it('should generate and store source summary', async () => {
      if (!dbAvailable) return;

      const mockSummaryResponse = JSON.stringify({
        narrative:
          'The interview discusses user frustrations with the checkout process, particularly around unclear payment options.',
        duration: 300,
        segmentCount: 3,
      });

      const mockProvider = createMockGeneralAIProvider(
        vi.fn().mockResolvedValue(mockSummaryResponse)
      );
      vi.mocked(getGeneralAIProvider).mockReturnValue(mockProvider);

      const { processSummaryJob } = await import('./summary-test-helper');
      const mockJob = createMockJob({
        sourceId: testSourceId,
        schemaName: TEST_SCHEMA,
      });

      await processSummaryJob(mockJob);

      // Verify summary was stored
      const source = await getSourceById(TEST_SCHEMA, testSourceId);
      expect(source?.summaryStatus).toBe('COMPLETED');
      expect(source?.summary).toBeTruthy();

      const summary = source?.summary as {
        narrative: string;
        duration: number;
        segmentCount: number;
      };
      expect(summary.narrative).toContain('checkout process');
      expect(summary.duration).toBe(300);
      expect(summary.segmentCount).toBe(3);
    });

    it('should handle markdown-wrapped JSON response', async () => {
      if (!dbAvailable) return;

      const mockSummaryResponse =
        '```json\n{"narrative": "Test summary", "duration": 300, "segmentCount": 3}\n```';

      const mockProvider = createMockGeneralAIProvider(
        vi.fn().mockResolvedValue(mockSummaryResponse)
      );
      vi.mocked(getGeneralAIProvider).mockReturnValue(mockProvider);

      const { processSummaryJob } = await import('./summary-test-helper');
      const mockJob = createMockJob({
        sourceId: testSourceId,
        schemaName: TEST_SCHEMA,
      });

      await processSummaryJob(mockJob);

      const source = await getSourceById(TEST_SCHEMA, testSourceId);
      expect(source?.summaryStatus).toBe('COMPLETED');
      const summary = source?.summary as { narrative: string };
      expect(summary.narrative).toBe('Test summary');
    });

    it('should update summary status to GENERATING during processing', async () => {
      if (!dbAvailable) return;

      let statusDuringProcessing: string | null = null;

      const mockProvider = createMockGeneralAIProvider(
        vi.fn().mockImplementation(async () => {
          // Check status during processing
          const source = await getSourceById(TEST_SCHEMA, testSourceId);
          statusDuringProcessing = source?.summaryStatus ?? null;
          return JSON.stringify({ narrative: 'Test', duration: 300, segmentCount: 3 });
        })
      );
      vi.mocked(getGeneralAIProvider).mockReturnValue(mockProvider);

      const { processSummaryJob } = await import('./summary-test-helper');
      const mockJob = createMockJob({
        sourceId: testSourceId,
        schemaName: TEST_SCHEMA,
      });

      await processSummaryJob(mockJob);

      expect(statusDuringProcessing).toBe('GENERATING');
    });

    it('should set summary status to FAILED on error', async () => {
      if (!dbAvailable) return;

      const mockProvider = createMockGeneralAIProvider(
        vi.fn().mockRejectedValue(new Error('AI API error'))
      );
      vi.mocked(getGeneralAIProvider).mockReturnValue(mockProvider);

      const { processSummaryJob } = await import('./summary-test-helper');
      const mockJob = createMockJob({
        sourceId: testSourceId,
        schemaName: TEST_SCHEMA,
      });

      await expect(processSummaryJob(mockJob)).rejects.toThrow('AI API error');

      const source = await getSourceById(TEST_SCHEMA, testSourceId);
      expect(source?.summaryStatus).toBe('FAILED');
    });

    it('should set summary_generated_at timestamp', async () => {
      if (!dbAvailable) return;

      const beforeTest = new Date();

      const mockProvider = createMockGeneralAIProvider(
        vi
          .fn()
          .mockResolvedValue(JSON.stringify({ narrative: 'Test', duration: 300, segmentCount: 3 }))
      );
      vi.mocked(getGeneralAIProvider).mockReturnValue(mockProvider);

      const { processSummaryJob } = await import('./summary-test-helper');
      const mockJob = createMockJob({
        sourceId: testSourceId,
        schemaName: TEST_SCHEMA,
      });

      await processSummaryJob(mockJob);

      const source = await getSourceById(TEST_SCHEMA, testSourceId);
      expect(source?.summaryGeneratedAt).toBeTruthy();
      expect(new Date(source!.summaryGeneratedAt!).getTime()).toBeGreaterThanOrEqual(
        beforeTest.getTime()
      );
    });
  });

  describe('Project Summary Generation', () => {
    beforeEach(async () => {
      if (!dbAvailable) return;

      // Add summary to the source (simulating completed source summary)
      const client = await testPool.connect();
      try {
        await client.query(`SET search_path TO ${TEST_SCHEMA}, public`);
        await client.query(
          `UPDATE sources SET summary = $1, summary_status = 'COMPLETED' WHERE id = $2`,
          [
            JSON.stringify({
              narrative: 'User discusses checkout frustrations.',
              duration: 300,
              segmentCount: 3,
            }),
            testSourceId,
          ]
        );
        await client.query('SET search_path TO public');
      } finally {
        client.release();
      }
    });

    it('should generate and store project summary', async () => {
      if (!dbAvailable) return;

      const mockProjectSummaryResponse = JSON.stringify({
        researchObjectives: 'Understanding checkout pain points',
        keyFindings: ['Users find payment options unclear', 'Checkout flow is confusing'],
        participantOverview: '1 participant interviewed',
        recommendations: ['Simplify payment selection', 'Add progress indicators'],
      });

      const mockProvider = createMockGeneralAIProvider(
        vi.fn().mockResolvedValue(mockProjectSummaryResponse)
      );
      vi.mocked(getGeneralAIProvider).mockReturnValue(mockProvider);

      const { processSummaryJob } = await import('./summary-test-helper');
      const mockJob = createMockJob({
        projectId: testProjectId,
        schemaName: TEST_SCHEMA,
      });

      await processSummaryJob(mockJob);

      // Verify project summary was stored
      const project = await getProjectById(TEST_SCHEMA, testProjectId);
      expect(project?.summaryStatus).toBe('COMPLETED');
      expect(project?.summary).toBeTruthy();

      const summary = project?.summary as {
        researchObjectives: string;
        keyFindings: string[];
        recommendations: string[];
      };
      expect(summary.researchObjectives).toContain('checkout');
      expect(summary.keyFindings).toHaveLength(2);
      expect(summary.recommendations).toContain('Simplify payment selection');
    });

    it('should aggregate multiple source summaries', async () => {
      if (!dbAvailable) return;

      // Add another source with summary
      const client = await testPool.connect();
      try {
        await client.query(`SET search_path TO ${TEST_SCHEMA}, public`);
        await client.query(
          `INSERT INTO sources (project_id, title, file_name, file_url, file_type, status, duration, summary_status, summary)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            testProjectId,
            'Second Interview',
            'interview2.mp3',
            'https://s3.example.com/interview2.mp3',
            'audio/mpeg',
            'COMPLETED',
            600,
            'COMPLETED',
            JSON.stringify({
              narrative: 'User discusses mobile app performance issues.',
              duration: 600,
              segmentCount: 10,
            }),
          ]
        );
        await client.query('SET search_path TO public');
      } finally {
        client.release();
      }

      const mockGenerateText = vi.fn().mockResolvedValue(
        JSON.stringify({
          researchObjectives: 'Understanding user pain points',
          keyFindings: ['Checkout issues', 'Mobile performance problems'],
          participantOverview: '2 participants interviewed',
          recommendations: ['Fix checkout', 'Optimize mobile'],
        })
      );
      const mockProvider = createMockGeneralAIProvider(mockGenerateText);
      vi.mocked(getGeneralAIProvider).mockReturnValue(mockProvider);

      const { processSummaryJob } = await import('./summary-test-helper');
      const mockJob = createMockJob({
        projectId: testProjectId,
        schemaName: TEST_SCHEMA,
      });

      await processSummaryJob(mockJob);

      // Verify generateText was called with aggregated source info
      expect(mockGenerateText).toHaveBeenCalledTimes(1);
      const prompt = mockGenerateText.mock.calls[0][0];
      expect(prompt).toContain('Second Interview');
    });

    it('should set project summary status to FAILED on error', async () => {
      if (!dbAvailable) return;

      const mockProvider = createMockGeneralAIProvider(
        vi.fn().mockRejectedValue(new Error('AI API error'))
      );
      vi.mocked(getGeneralAIProvider).mockReturnValue(mockProvider);

      const { processSummaryJob } = await import('./summary-test-helper');
      const mockJob = createMockJob({
        projectId: testProjectId,
        schemaName: TEST_SCHEMA,
      });

      await expect(processSummaryJob(mockJob)).rejects.toThrow('AI API error');

      const project = await getProjectById(TEST_SCHEMA, testProjectId);
      expect(project?.summaryStatus).toBe('FAILED');
    });
  });
});

/**
 * Create a mock BullMQ Job object for testing
 */
function createMockJob(data: SummaryGenerationJobData): Job<SummaryGenerationJobData> {
  return {
    id: 'test-job-id',
    data,
    updateProgress: vi.fn(),
    log: vi.fn(),
  } as unknown as Job<SummaryGenerationJobData>;
}
