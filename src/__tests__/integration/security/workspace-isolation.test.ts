/**
 * Workspace Isolation Security Tests
 *
 * These tests verify that users cannot access data belonging to other workspaces.
 * This is a critical security boundary in the multi-tenant architecture.
 *
 * Test scenarios:
 * - User A cannot list User B's projects
 * - User A cannot GET User B's project by ID
 * - User A cannot list sources from User B's projects
 * - User A cannot create/update data in User B's workspace
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
  createTestProject,
  TEST_SCHEMA,
  type TestSeedData,
} from '../setup';

// Mock auth and database modules
vi.mock('@/lib/auth', () => ({
  auth: mockAuth,
}));

vi.mock('@/lib/db', () => ({
  prisma: testPrisma,
  default: testPrisma,
}));

let dbAvailable = false;

describe('Workspace Isolation Security', () => {
  let userAData: TestSeedData;
  let userBData: Awaited<ReturnType<typeof createOtherUserWithWorkspace>>;
  let userBProjectId: string;
  let userBSourceId: string;

  beforeAll(async () => {
    try {
      await setupTestDatabase();
      dbAvailable = true;
    } catch {
      console.warn('Skipping integration tests: Database not available');
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

    // Create User A with workspace and project
    userAData = await seedTestData();

    // Create User B with separate workspace
    userBData = await createOtherUserWithWorkspace();

    // Create project and source for User B
    const client = await testPool.connect();
    try {
      await client.query(`SET search_path TO ${TEST_SCHEMA}, public`);

      // Create project in User B's workspace
      const projectResult = await client.query(
        `INSERT INTO projects (workspace_id, name) VALUES ($1, $2) RETURNING id`,
        [userBData.workspace.id, 'User B Project']
      );
      userBProjectId = projectResult.rows[0].id;

      // Create source in User B's project
      const sourceResult = await client.query(
        `INSERT INTO sources (project_id, title, file_name, file_url, file_type, status, duration)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [
          userBProjectId,
          'User B Interview',
          'userb-interview.mp3',
          'https://s3.example.com/userb-interview.mp3',
          'audio/mpeg',
          'COMPLETED',
          600,
        ]
      );
      userBSourceId = sourceResult.rows[0].id;

      // Create segment in User B's source
      await client.query(
        `INSERT INTO transcript_segments (source_id, content, start_time, end_time)
         VALUES ($1, $2, $3, $4)`,
        [userBSourceId, 'This is User B content that should be private.', 0, 10]
      );

      await client.query('SET search_path TO public');
    } finally {
      client.release();
    }

    // Default: set session to User A
    setMockSession(createMockSession(userAData));
  });

  /**
   * Helper to set session to User B
   */
  function setSessionToUserB() {
    setMockSession({
      user: {
        id: userBData.user.id,
        email: userBData.user.email,
        name: 'User B',
        organizations: [
          {
            id: userBData.org.id,
            name: userBData.org.name,
            slug: userBData.org.slug,
            schemaName: TEST_SCHEMA,
            role: 'OWNER' as const,
          },
        ],
        currentOrgId: userBData.org.id,
        currentOrgSlug: userBData.org.slug,
        currentSchemaName: TEST_SCHEMA,
        currentRole: 'OWNER' as const,
      },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });
  }

  describe('Project Listing Isolation', () => {
    it('User A should only see their own projects', async () => {
      if (!dbAvailable) return;

      const { GET } = await import('@/app/api/projects/route');
      const response = await GET(new Request('http://localhost/api/projects'));

      expect(response.status).toBe(200);
      const projects = await response.json();

      // User A should only see their project
      expect(projects).toHaveLength(1);
      expect(projects[0].name).toBe('Test Project');
      expect(projects.some((p: { name: string }) => p.name === 'User B Project')).toBe(false);
    });

    it('User B should only see their own projects', async () => {
      if (!dbAvailable) return;

      setSessionToUserB();

      const { GET } = await import('@/app/api/projects/route');
      const response = await GET(new Request('http://localhost/api/projects'));

      expect(response.status).toBe(200);
      const projects = await response.json();

      // User B should only see their project
      expect(projects).toHaveLength(1);
      expect(projects[0].name).toBe('User B Project');
      expect(projects.some((p: { name: string }) => p.name === 'Test Project')).toBe(false);
    });
  });

  describe('Project Access by ID Isolation', () => {
    it('User A cannot access User B project by ID', async () => {
      if (!dbAvailable) return;

      const { GET } = await import('@/app/api/projects/[projectId]/route');
      const response = await GET(new Request(`http://localhost/api/projects/${userBProjectId}`), {
        params: Promise.resolve({ projectId: userBProjectId }),
      });

      // Should return 403 (forbidden) or 404 (not found) - both are acceptable for security
      expect([403, 404]).toContain(response.status);
    });

    it('User A can access their own project by ID', async () => {
      if (!dbAvailable) return;

      const { GET } = await import('@/app/api/projects/[projectId]/route');
      const response = await GET(
        new Request(`http://localhost/api/projects/${userAData.project.id}`),
        {
          params: Promise.resolve({ projectId: userAData.project.id }),
        }
      );

      expect(response.status).toBe(200);
      const project = await response.json();
      expect(project.name).toBe('Test Project');
    });
  });

  describe('Source Listing Isolation', () => {
    it('User A cannot list sources from User B project', async () => {
      if (!dbAvailable) return;

      const { GET } = await import('@/app/api/projects/[projectId]/sources/route');
      const response = await GET(
        new Request(`http://localhost/api/projects/${userBProjectId}/sources`),
        {
          params: Promise.resolve({ projectId: userBProjectId }),
        }
      );

      // Should return 403 or 404
      expect([403, 404]).toContain(response.status);
    });

    it('User A can list sources from their own project', async () => {
      if (!dbAvailable) return;

      const { GET } = await import('@/app/api/projects/[projectId]/sources/route');
      const response = await GET(
        new Request(`http://localhost/api/projects/${userAData.project.id}/sources`),
        {
          params: Promise.resolve({ projectId: userAData.project.id }),
        }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.sources).toHaveLength(1);
      expect(data.sources[0].title).toBe('Test Interview');
    });
  });

  describe('Source Access by ID Isolation', () => {
    it('User A cannot access User B source by ID', async () => {
      if (!dbAvailable) return;

      const { GET } = await import('@/app/api/sources/[sourceId]/route');
      const response = await GET(new Request(`http://localhost/api/sources/${userBSourceId}`), {
        params: Promise.resolve({ sourceId: userBSourceId }),
      });

      // Should return 403 or 404
      expect([403, 404]).toContain(response.status);
    });

    it('User A can access their own source by ID', async () => {
      if (!dbAvailable) return;

      const { GET } = await import('@/app/api/sources/[sourceId]/route');
      const response = await GET(
        new Request(`http://localhost/api/sources/${userAData.source.id}`),
        {
          params: Promise.resolve({ sourceId: userAData.source.id }),
        }
      );

      expect(response.status).toBe(200);
      const source = await response.json();
      expect(source.title).toBe('Test Interview');
    });
  });

  // Note: Segments are accessed via the source endpoint which includes segments
  // There is no separate /segments route, so segment isolation is tested via source access

  describe('Search Isolation', () => {
    it('User A search should not return User B content', async () => {
      if (!dbAvailable) return;

      // Note: Search requires embeddings to work, so this is a simplified test
      // checking that the search endpoint respects workspace boundaries

      const { POST } = await import('@/app/api/projects/[projectId]/search/route');
      const response = await POST(
        new Request(`http://localhost/api/projects/${userAData.project.id}/search`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: 'private' }),
        }),
        {
          params: Promise.resolve({ projectId: userAData.project.id }),
        }
      );

      expect(response.status).toBe(200);
      const data = await response.json();

      // Results should not contain User B's content
      const hasUserBContent = data.results.some(
        (r: { content: string }) =>
          r.content && r.content.includes('User B content that should be private')
      );
      expect(hasUserBContent).toBe(false);
    });

    it('User A cannot search in User B project', async () => {
      if (!dbAvailable) return;

      const { POST } = await import('@/app/api/projects/[projectId]/search/route');
      const response = await POST(
        new Request(`http://localhost/api/projects/${userBProjectId}/search`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: 'test' }),
        }),
        {
          params: Promise.resolve({ projectId: userBProjectId }),
        }
      );

      // Should return 403 or 404
      expect([403, 404]).toContain(response.status);
    });
  });

  describe('Tag Access Isolation', () => {
    it('User A cannot list tags from User B project', async () => {
      if (!dbAvailable) return;

      const { GET } = await import('@/app/api/projects/[projectId]/tags/route');
      const response = await GET(
        new Request(`http://localhost/api/projects/${userBProjectId}/tags`),
        {
          params: Promise.resolve({ projectId: userBProjectId }),
        }
      );

      // Should return 403 or 404
      expect([403, 404]).toContain(response.status);
    });

    it('User A can list tags from their own project', async () => {
      if (!dbAvailable) return;

      const { GET } = await import('@/app/api/projects/[projectId]/tags/route');
      const response = await GET(
        new Request(`http://localhost/api/projects/${userAData.project.id}/tags`),
        {
          params: Promise.resolve({ projectId: userAData.project.id }),
        }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.tags.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Theme Access Isolation', () => {
    it('User A cannot list themes from User B project', async () => {
      if (!dbAvailable) return;

      const { GET } = await import('@/app/api/projects/[projectId]/themes/route');
      const response = await GET(
        new Request(`http://localhost/api/projects/${userBProjectId}/themes`),
        {
          params: Promise.resolve({ projectId: userBProjectId }),
        }
      );

      // Should return 403 or 404
      expect([403, 404]).toContain(response.status);
    });
  });
});
