/**
 * Sources API - Integration Tests
 *
 * Tests the sources API endpoints with multi-tenant schema support.
 * Run with: pnpm test src/__tests__/integration/api/sources.api.test.ts
 *
 * Requirements:
 * - Docker containers running (postgres with pgvector)
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import {
  testPrisma,
  testPool,
  setupTestDatabase,
  teardownTestDatabase,
  clearTestData,
  seedTestData,
  createMockSession,
  setMockSession,
  mockAuth,
  createOtherUserWithWorkspace,
  TEST_SCHEMA,
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

// Note: tenant-queries are NOT mocked - they use the real tenant_test schema

// Check if database is available
let dbAvailable = false;

describe('Sources API', () => {
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
  });

  describe('GET /api/sources/[sourceId]', () => {
    it('should return 401 when not authenticated', async () => {
      if (!dbAvailable) return;

      setMockSession(null);

      const { GET } = await import('@/app/api/sources/[sourceId]/route');

      const request = new Request(`http://localhost/api/sources/${testData.source.id}`);
      const response = await GET(request, {
        params: Promise.resolve({ sourceId: testData.source.id }),
      });

      expect(response.status).toBe(401);
    });

    it('should return 404 for invalid source ID format', async () => {
      if (!dbAvailable) return;

      const { GET } = await import('@/app/api/sources/[sourceId]/route');

      // Note: idSchema only validates non-empty string, not UUID format
      // So 'invalid-id' passes validation but doesn't exist -> 404
      const request = new Request('http://localhost/api/sources/invalid-id');
      const response = await GET(request, { params: Promise.resolve({ sourceId: 'invalid-id' }) });

      expect(response.status).toBe(404);
    });

    it('should return 404 for non-existent source', async () => {
      if (!dbAvailable) return;

      const { GET } = await import('@/app/api/sources/[sourceId]/route');
      const fakeId = 'cm000000000000000000000000';

      const request = new Request(`http://localhost/api/sources/${fakeId}`);
      const response = await GET(request, { params: Promise.resolve({ sourceId: fakeId }) });

      expect(response.status).toBe(404);
    });

    it('should return 404 for source from another workspace', async () => {
      if (!dbAvailable) return;

      // Create another workspace with a source in tenant_test schema
      const otherData = await createOtherUserWithWorkspace();

      let otherSourceId: string;
      const client = await testPool.connect();
      try {
        await client.query(`SET search_path TO ${TEST_SCHEMA}, public`);

        // Create project in other workspace
        const projectResult = await client.query(
          `INSERT INTO projects (workspace_id, name) VALUES ($1, $2) RETURNING id`,
          [otherData.workspace.id, 'Other Project']
        );
        const otherProjectId = projectResult.rows[0].id;

        // Create source
        const sourceResult = await client.query(
          `INSERT INTO sources (project_id, title, file_name, file_url, file_type, status)
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
          [
            otherProjectId,
            'Other Source',
            'other.mp4',
            'https://example.com/other.mp4',
            'video/mp4',
            'COMPLETED',
          ]
        );
        otherSourceId = sourceResult.rows[0].id;

        await client.query('SET search_path TO public');
      } finally {
        client.release();
      }

      const { GET } = await import('@/app/api/sources/[sourceId]/route');

      const request = new Request(`http://localhost/api/sources/${otherSourceId}`);
      const response = await GET(request, {
        params: Promise.resolve({ sourceId: otherSourceId }),
      });

      expect(response.status).toBe(404);
    });

    it('should return source with segments and project tags', async () => {
      if (!dbAvailable) return;

      const { GET } = await import('@/app/api/sources/[sourceId]/route');

      const request = new Request(`http://localhost/api/sources/${testData.source.id}`);
      const response = await GET(request, {
        params: Promise.resolve({ sourceId: testData.source.id }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.id).toBe(testData.source.id);
      expect(data.title).toBe('Test Interview');
      expect(data.segments).toHaveLength(5);
      expect(data.project).toBeDefined();
      expect(data.project.tags).toHaveLength(2);
      expect(data.project.workspace).toBeDefined();
    });

    it('should return segments ordered by start time', async () => {
      if (!dbAvailable) return;

      const { GET } = await import('@/app/api/sources/[sourceId]/route');

      const request = new Request(`http://localhost/api/sources/${testData.source.id}`);
      const response = await GET(request, {
        params: Promise.resolve({ sourceId: testData.source.id }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      // Check segments are ordered by startTime
      for (let i = 1; i < data.segments.length; i++) {
        expect(data.segments[i].startTime).toBeGreaterThanOrEqual(data.segments[i - 1].startTime);
      }
    });

    it('should include highlight information with tags', async () => {
      if (!dbAvailable) return;

      // Create a highlight on the first segment in tenant_test schema
      const client = await testPool.connect();
      try {
        await client.query(`SET search_path TO ${TEST_SCHEMA}, public`);

        // Get first segment
        const segmentResult = await client.query(
          `SELECT id FROM transcript_segments WHERE source_id = $1 ORDER BY start_time ASC LIMIT 1`,
          [testData.source.id]
        );
        const firstSegmentId = segmentResult.rows[0].id;

        // Create highlight
        await client.query(
          `INSERT INTO highlights (segment_id, tag_id, note) VALUES ($1, $2, $3)`,
          [firstSegmentId, testData.tags[0].id, 'Test highlight note']
        );

        await client.query('SET search_path TO public');
      } finally {
        client.release();
      }

      const { GET } = await import('@/app/api/sources/[sourceId]/route');

      const request = new Request(`http://localhost/api/sources/${testData.source.id}`);
      const response = await GET(request, {
        params: Promise.resolve({ sourceId: testData.source.id }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      // Find the segment with the highlight
      const segmentWithHighlight = data.segments.find(
        (s: { highlights?: unknown[] }) => s.highlights && s.highlights.length > 0
      );
      expect(segmentWithHighlight).toBeDefined();
      expect(segmentWithHighlight.highlights[0].note).toBe('Test highlight note');
      expect(segmentWithHighlight.highlights[0].tag).toBeDefined();
      expect(segmentWithHighlight.highlights[0].tag.name).toBe('Pain Point');
    });
  });
});
