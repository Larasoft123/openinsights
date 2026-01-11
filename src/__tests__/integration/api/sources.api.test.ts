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

// Mock tenant-queries to use Prisma (tests use public schema)
vi.mock('@/lib/db/tenant-queries', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/db/tenant-queries')>();
  return {
    ...actual,
    // Override verifySourceAccessTenant
    verifySourceAccessTenant: async (
      _schemaName: string,
      sourceId: string,
      workspaceId: string
    ) => {
      const source = await testPrisma.source.findFirst({
        where: {
          id: sourceId,
          project: { workspaceId },
        },
      });
      if (!source) return null;
      return {
        id: source.id,
        projectId: source.projectId,
        title: source.title,
        fileName: source.fileName,
        fileUrl: source.fileUrl,
        fileType: source.fileType,
        duration: source.duration,
        status: source.status,
        processingStep: source.processingStep,
        processingProgress: source.processingProgress,
        processingStartedAt: source.processingStartedAt,
        deletedAt: source.deletedAt,
        summary: source.summary as Record<string, unknown> | null,
        summaryStatus: source.summaryStatus,
        summaryGeneratedAt: source.summaryGeneratedAt,
        createdAt: source.createdAt,
        updatedAt: source.updatedAt,
      };
    },
    // Override getSourceWithDetails
    getSourceWithDetails: async (_schemaName: string, sourceId: string) => {
      const source = await testPrisma.source.findUnique({
        where: { id: sourceId },
        include: {
          segments: {
            orderBy: { startTime: 'asc' },
            include: {
              highlights: {
                include: {
                  tag: true,
                },
              },
            },
          },
          project: {
            include: {
              tags: true,
              workspace: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                },
              },
            },
          },
        },
      });
      return source;
    },
  };
});

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

    it('should return 400 for invalid source ID', async () => {
      if (!dbAvailable) return;

      const { GET } = await import('@/app/api/sources/[sourceId]/route');

      const request = new Request('http://localhost/api/sources/invalid-id');
      const response = await GET(request, { params: Promise.resolve({ sourceId: 'invalid-id' }) });

      expect(response.status).toBe(400);
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

      // Create project in another workspace
      const otherWorkspace = await testPrisma.workspace.create({
        data: { name: 'Other Workspace', slug: 'other-workspace-src' },
      });
      const otherProject = await testPrisma.project.create({
        data: {
          name: 'Other Project',
          workspaceId: otherWorkspace.id,
        },
      });
      const otherSource = await testPrisma.source.create({
        data: {
          title: 'Other Source',
          fileName: 'other.mp4',
          fileUrl: 'https://example.com/other.mp4',
          fileType: 'video/mp4',
          projectId: otherProject.id,
        },
      });

      const { GET } = await import('@/app/api/sources/[sourceId]/route');

      const request = new Request(`http://localhost/api/sources/${otherSource.id}`);
      const response = await GET(request, {
        params: Promise.resolve({ sourceId: otherSource.id }),
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

      // Create a highlight on the first segment
      const firstSegment = await testPrisma.transcriptSegment.findFirst({
        where: { sourceId: testData.source.id },
        orderBy: { startTime: 'asc' },
      });

      await testPrisma.highlight.create({
        data: {
          segmentId: firstSegment!.id,
          tagId: testData.tags[0].id,
          note: 'Test highlight note',
        },
      });

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
