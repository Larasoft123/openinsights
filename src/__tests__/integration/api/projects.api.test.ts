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
    // Override functions to use testPrisma for testing
    listProjects: async (_schemaName: string, workspaceId: string) => {
      const projects = await testPrisma.project.findMany({
        where: { workspaceId },
        include: {
          _count: { select: { sources: true } },
        },
        orderBy: { updatedAt: 'desc' },
      });
      return projects;
    },
    createProject: async (
      _schemaName: string,
      data: { workspaceId: string; name: string; description?: string | null }
    ) => {
      const project = await testPrisma.project.create({
        data: {
          workspaceId: data.workspaceId,
          name: data.name,
          description: data.description || null,
        },
        include: {
          _count: { select: { sources: true } },
        },
      });
      return project;
    },
  };
});

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

      // Create a user with a different workspace
      const otherWorkspace = await testPrisma.workspace.create({
        data: { name: 'Other Workspace', slug: 'other-workspace' },
      });
      const otherUser = await testPrisma.user.create({
        data: {
          email: 'other@example.com',
          workspaceId: otherWorkspace.id,
        },
      });

      // Create organization and membership for other user
      // Note: schemaName must be unique, so we use 'public_other' (still queries public in tests)
      const otherOrg = await testPrisma.organization.create({
        data: {
          id: 'other-org',
          name: 'Other Org',
          slug: 'other-org',
          schemaName: 'public_other',
        },
      });
      await testPrisma.organizationMember.create({
        data: {
          organizationId: otherOrg.id,
          userId: otherUser.id,
          role: 'OWNER',
          joinedAt: new Date(),
        },
      });

      // Set session to other user with multi-tenant fields
      // Note: schemaName is 'public_other' to match DB constraint,
      // but our mocked listProjects ignores schemaName and uses testPrisma
      setMockSession({
        user: {
          id: otherUser.id,
          email: otherUser.email,
          name: 'Other User',
          workspaceId: otherWorkspace.id,
          organizations: [
            {
              id: 'other-org',
              name: 'Other Org',
              slug: 'other-org',
              schemaName: 'public_other',
              role: 'OWNER' as const,
            },
          ],
          currentOrgId: 'other-org',
          currentOrgSlug: 'other-org',
          currentSchemaName: 'public_other',
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

      // Create project in another workspace
      const otherWorkspace = await testPrisma.workspace.create({
        data: { name: 'Other Workspace', slug: 'other-workspace-2' },
      });
      await testPrisma.project.create({
        data: {
          name: 'Other Project',
          workspaceId: otherWorkspace.id,
        },
      });

      const { GET } = await import('@/app/api/projects/route');

      const request = new Request('http://localhost/api/projects');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
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
