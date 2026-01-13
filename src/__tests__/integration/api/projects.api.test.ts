/**
 * Projects API - Integration Tests
 *
 * Tests the projects API endpoints with multi-tenant schema support.
 * Run with: pnpm test src/__tests__/integration/api/projects.api.test.ts
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
  createOtherUserWithWorkspace,
  createTestProject,
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

describe('Projects API', () => {
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

  describe('GET /api/projects', () => {
    it('should return 401 when not authenticated', async () => {
      if (!dbAvailable) return;

      setMockSession(null);

      const { GET } = await import('@/app/api/projects/route');

      const request = new Request('http://localhost/api/projects');
      const response = await GET(request);

      expect(response.status).toBe(401);
    });

    it('should return empty array when no projects exist for user', async () => {
      if (!dbAvailable) return;

      // Create another user with a different workspace (in same tenant_test schema)
      const otherData = await createOtherUserWithWorkspace();

      // Set session to other user (no projects in their workspace)
      setMockSession({
        user: {
          id: otherData.user.id,
          email: otherData.user.email,
          name: 'Other User',
          organizations: [
            {
              id: otherData.org.id,
              name: otherData.org.name,
              slug: otherData.org.slug,
              schemaName: TEST_SCHEMA,
              role: 'OWNER' as const,
            },
          ],
          currentOrgId: otherData.org.id,
          currentOrgSlug: otherData.org.slug,
          currentSchemaName: TEST_SCHEMA,
          currentRole: 'OWNER' as const,
        },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });

      const { GET } = await import('@/app/api/projects/route');

      const request = new Request('http://localhost/api/projects');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toEqual([]);
    });

    it('should return all projects for the current workspace', async () => {
      if (!dbAvailable) return;

      const { GET } = await import('@/app/api/projects/route');

      const request = new Request('http://localhost/api/projects');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveLength(1);
      expect(data[0].name).toBe('Test Project');
      expect(data[0]).toHaveProperty('_count');
      expect(data[0]._count.sources).toBe(1);
    });

    it('should not return projects from other workspaces', async () => {
      if (!dbAvailable) return;

      // Create another workspace with a project
      const otherData = await createOtherUserWithWorkspace();
      await createTestProject(otherData.workspace.id, 'Other Project');

      const { GET } = await import('@/app/api/projects/route');

      const request = new Request('http://localhost/api/projects');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      // Should only see our own project, not the other workspace's
      expect(data).toHaveLength(1);
      expect(data[0].name).toBe('Test Project');
    });
  });

  describe('POST /api/projects', () => {
    it('should return 401 when not authenticated', async () => {
      if (!dbAvailable) return;

      setMockSession(null);

      const { POST } = await import('@/app/api/projects/route');

      const request = new Request('http://localhost/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'New Project' }),
      });
      const response = await POST(request);

      expect(response.status).toBe(401);
    });

    it('should create a new project', async () => {
      if (!dbAvailable) return;

      const { POST } = await import('@/app/api/projects/route');

      const request = new Request('http://localhost/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'New Project',
          description: 'A test project',
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.name).toBe('New Project');
      expect(data.description).toBe('A test project');
      expect(data.workspaceId).toBe(testData.workspace.id);
      expect(data._count.sources).toBe(0);
    });

    it('should create project without description', async () => {
      if (!dbAvailable) return;

      const { POST } = await import('@/app/api/projects/route');

      const request = new Request('http://localhost/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Project Without Description' }),
      });
      const response = await POST(request);

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.name).toBe('Project Without Description');
      expect(data.description).toBeNull();
    });

    it('should return 400 for missing name', async () => {
      if (!dbAvailable) return;

      const { POST } = await import('@/app/api/projects/route');

      const request = new Request('http://localhost/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: 'No name provided' }),
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it('should return 400 for empty name', async () => {
      if (!dbAvailable) return;

      const { POST } = await import('@/app/api/projects/route');

      const request = new Request('http://localhost/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: '' }),
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
    });
  });
});
