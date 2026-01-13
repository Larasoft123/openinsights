/**
 * Themes API - Integration Tests
 *
 * TDD: These tests define the expected behavior of the themes API.
 * Run with: pnpm test src/__tests__/integration/api/themes.api.test.ts
 *
 * Requirements:
 * - Docker containers running (postgres with pgvector)
 *
 * These tests are skipped when the database is not available.
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
  createTestTheme,
  createTestHighlight,
  addHighlightToTheme,
  getTestTheme,
  getHighlightTheme,
  getTestHighlight,
  createTestProject,
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

describe('Themes API', () => {
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

  describe('GET /api/projects/[projectId]/themes', () => {
    it('should return 401 when not authenticated', async () => {
      if (!dbAvailable) return;

      // Clear the mock session
      setMockSession(null);

      const { GET } = await import('@/app/api/projects/[projectId]/themes/route');

      const request = new Request('http://localhost/api/projects/test/themes');
      const response = await GET(request, {
        params: Promise.resolve({ projectId: testData.project.id }),
      });

      expect(response.status).toBe(401);
    });

    it('should return empty array when no themes exist', async () => {
      if (!dbAvailable) return;

      const { GET } = await import('@/app/api/projects/[projectId]/themes/route');

      const request = new Request('http://localhost/api/projects/test/themes');
      const response = await GET(request, {
        params: Promise.resolve({ projectId: testData.project.id }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.themes).toEqual([]);
    });

    it('should return all themes for a project', async () => {
      if (!dbAvailable) return;

      // Create themes using helper
      await createTestTheme(testData.project.id, 'Usability Issues', { color: '#EF4444' });
      await createTestTheme(testData.project.id, 'Feature Requests', { color: '#3B82F6' });

      const { GET } = await import('@/app/api/projects/[projectId]/themes/route');

      const request = new Request('http://localhost/api/projects/test/themes');
      const response = await GET(request, {
        params: Promise.resolve({ projectId: testData.project.id }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.themes).toHaveLength(2);
      expect(data.themes[0]).toHaveProperty('id');
      expect(data.themes[0]).toHaveProperty('name');
      expect(data.themes[0]).toHaveProperty('color');
      expect(data.themes[0]).toHaveProperty('description');
    });

    it('should not return themes from other projects', async () => {
      if (!dbAvailable) return;

      // Create theme in test project
      await createTestTheme(testData.project.id, 'Test Theme');

      // Create another project with a theme
      const otherProject = await createTestProject(testData.workspace.id, 'Other Project');
      await createTestTheme(otherProject.id, 'Other Theme');

      const { GET } = await import('@/app/api/projects/[projectId]/themes/route');

      const request = new Request('http://localhost/api/projects/test/themes');
      const response = await GET(request, {
        params: Promise.resolve({ projectId: testData.project.id }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.themes).toHaveLength(1);
      expect(data.themes[0].name).toBe('Test Theme');
    });

    it('should include highlight count for each theme', async () => {
      if (!dbAvailable) return;

      // Create theme
      const theme = await createTestTheme(testData.project.id, 'Test Theme');

      // Create a highlight and assign to theme
      const highlight = await createTestHighlight(testData.segments[0].id, testData.tags[0].id);
      await addHighlightToTheme(highlight.id, theme.id);

      const { GET } = await import('@/app/api/projects/[projectId]/themes/route');

      const request = new Request('http://localhost/api/projects/test/themes');
      const response = await GET(request, {
        params: Promise.resolve({ projectId: testData.project.id }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.themes[0].highlightCount).toBe(1);
    });
  });

  describe('POST /api/projects/[projectId]/themes', () => {
    it('should return 401 when not authenticated', async () => {
      if (!dbAvailable) return;

      setMockSession(null);

      const { POST } = await import('@/app/api/projects/[projectId]/themes/route');

      const request = new Request('http://localhost/api/projects/test/themes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'New Theme' }),
      });
      const response = await POST(request, {
        params: Promise.resolve({ projectId: testData.project.id }),
      });

      expect(response.status).toBe(401);
    });

    it('should create a new theme', async () => {
      if (!dbAvailable) return;

      const { POST } = await import('@/app/api/projects/[projectId]/themes/route');

      const request = new Request('http://localhost/api/projects/test/themes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'New Theme',
          description: 'A test theme',
          color: '#10B981',
        }),
      });
      const response = await POST(request, {
        params: Promise.resolve({ projectId: testData.project.id }),
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.theme.name).toBe('New Theme');
      expect(data.theme.description).toBe('A test theme');
      expect(data.theme.color).toBe('#10B981');
      expect(data.theme.projectId).toBe(testData.project.id);
    });

    it('should create theme with default color if not provided', async () => {
      if (!dbAvailable) return;

      const { POST } = await import('@/app/api/projects/[projectId]/themes/route');

      const request = new Request('http://localhost/api/projects/test/themes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Theme Without Color' }),
      });
      const response = await POST(request, {
        params: Promise.resolve({ projectId: testData.project.id }),
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.theme.color).toBe('#6366F1'); // Default color from schema
    });

    it('should return 400 for missing name', async () => {
      if (!dbAvailable) return;

      const { POST } = await import('@/app/api/projects/[projectId]/themes/route');

      const request = new Request('http://localhost/api/projects/test/themes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: 'No name' }),
      });
      const response = await POST(request, {
        params: Promise.resolve({ projectId: testData.project.id }),
      });

      expect(response.status).toBe(400);
    });

    it('should return 400 for duplicate theme name in same project', async () => {
      if (!dbAvailable) return;

      // Create existing theme
      await createTestTheme(testData.project.id, 'Existing Theme');

      const { POST } = await import('@/app/api/projects/[projectId]/themes/route');

      const request = new Request('http://localhost/api/projects/test/themes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Existing Theme' }),
      });
      const response = await POST(request, {
        params: Promise.resolve({ projectId: testData.project.id }),
      });

      expect(response.status).toBe(400);
    });
  });

  describe('PATCH /api/projects/[projectId]/themes/[themeId]', () => {
    it('should update theme name', async () => {
      if (!dbAvailable) return;

      const theme = await createTestTheme(testData.project.id, 'Original Name');

      const { PATCH } = await import('@/app/api/projects/[projectId]/themes/[themeId]/route');

      const request = new Request('http://localhost/api/projects/test/themes/test', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Updated Name' }),
      });
      const response = await PATCH(request, {
        params: Promise.resolve({ projectId: testData.project.id, themeId: theme.id }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.theme.name).toBe('Updated Name');
    });

    it('should update theme color', async () => {
      if (!dbAvailable) return;

      const theme = await createTestTheme(testData.project.id, 'Test Theme');

      const { PATCH } = await import('@/app/api/projects/[projectId]/themes/[themeId]/route');

      const request = new Request('http://localhost/api/projects/test/themes/test', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ color: '#F59E0B' }),
      });
      const response = await PATCH(request, {
        params: Promise.resolve({ projectId: testData.project.id, themeId: theme.id }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.theme.color).toBe('#F59E0B');
    });

    it('should return 404 for non-existent theme', async () => {
      if (!dbAvailable) return;

      const { PATCH } = await import('@/app/api/projects/[projectId]/themes/[themeId]/route');

      const request = new Request('http://localhost/api/projects/test/themes/test', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test' }),
      });
      const response = await PATCH(request, {
        params: Promise.resolve({ projectId: testData.project.id, themeId: 'non-existent-id' }),
      });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/projects/[projectId]/themes/[themeId]', () => {
    it('should delete a theme', async () => {
      if (!dbAvailable) return;

      const theme = await createTestTheme(testData.project.id, 'Theme to Delete');

      const { DELETE } = await import('@/app/api/projects/[projectId]/themes/[themeId]/route');

      const request = new Request('http://localhost/api/projects/test/themes/test', {
        method: 'DELETE',
      });
      const response = await DELETE(request, {
        params: Promise.resolve({ projectId: testData.project.id, themeId: theme.id }),
      });

      expect(response.status).toBe(200);

      // Verify deleted
      const deletedTheme = await getTestTheme(theme.id);
      expect(deletedTheme).toBeNull();
    });

    it('should cascade delete highlight-theme associations', async () => {
      if (!dbAvailable) return;

      // Create theme
      const theme = await createTestTheme(testData.project.id, 'Theme with Highlights');

      // Create highlight and associate with theme
      const highlight = await createTestHighlight(testData.segments[0].id, testData.tags[0].id);
      await addHighlightToTheme(highlight.id, theme.id);

      const { DELETE } = await import('@/app/api/projects/[projectId]/themes/[themeId]/route');

      const request = new Request('http://localhost/api/projects/test/themes/test', {
        method: 'DELETE',
      });
      const response = await DELETE(request, {
        params: Promise.resolve({ projectId: testData.project.id, themeId: theme.id }),
      });

      expect(response.status).toBe(200);

      // Verify highlight-theme association is deleted
      const association = await getHighlightTheme(highlight.id, theme.id);
      expect(association).toBeNull();

      // But highlight itself should still exist
      const existingHighlight = await getTestHighlight(highlight.id);
      expect(existingHighlight).not.toBeNull();
    });

    it('should return 404 for non-existent theme', async () => {
      if (!dbAvailable) return;

      const { DELETE } = await import('@/app/api/projects/[projectId]/themes/[themeId]/route');

      const request = new Request('http://localhost/api/projects/test/themes/test', {
        method: 'DELETE',
      });
      const response = await DELETE(request, {
        params: Promise.resolve({ projectId: testData.project.id, themeId: 'non-existent-id' }),
      });

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/projects/[projectId]/themes/[themeId]/highlights', () => {
    it('should add highlight to theme', async () => {
      if (!dbAvailable) return;

      const theme = await createTestTheme(testData.project.id, 'Test Theme');
      const highlight = await createTestHighlight(testData.segments[0].id, testData.tags[0].id);

      const { POST } =
        await import('@/app/api/projects/[projectId]/themes/[themeId]/highlights/route');

      const request = new Request('http://localhost/api/projects/test/themes/test/highlights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ highlightId: highlight.id }),
      });
      const response = await POST(request, {
        params: Promise.resolve({ projectId: testData.project.id, themeId: theme.id }),
      });

      expect(response.status).toBe(201);

      // Verify association created
      const association = await getHighlightTheme(highlight.id, theme.id);
      expect(association).not.toBeNull();
    });

    it('should return 400 for duplicate assignment', async () => {
      if (!dbAvailable) return;

      const theme = await createTestTheme(testData.project.id, 'Test Theme');
      const highlight = await createTestHighlight(testData.segments[0].id, testData.tags[0].id);

      // First assignment
      await addHighlightToTheme(highlight.id, theme.id);

      const { POST } =
        await import('@/app/api/projects/[projectId]/themes/[themeId]/highlights/route');

      const request = new Request('http://localhost/api/projects/test/themes/test/highlights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ highlightId: highlight.id }),
      });
      const response = await POST(request, {
        params: Promise.resolve({ projectId: testData.project.id, themeId: theme.id }),
      });

      expect(response.status).toBe(400);
    });
  });

  describe('DELETE /api/projects/[projectId]/themes/[themeId]/highlights/[highlightId]', () => {
    it('should remove highlight from theme', async () => {
      if (!dbAvailable) return;

      const theme = await createTestTheme(testData.project.id, 'Test Theme');
      const highlight = await createTestHighlight(testData.segments[0].id, testData.tags[0].id);
      await addHighlightToTheme(highlight.id, theme.id);

      const { DELETE } =
        await import('@/app/api/projects/[projectId]/themes/[themeId]/highlights/[highlightId]/route');

      const request = new Request(
        'http://localhost/api/projects/test/themes/test/highlights/test',
        { method: 'DELETE' }
      );
      const response = await DELETE(request, {
        params: Promise.resolve({
          projectId: testData.project.id,
          themeId: theme.id,
          highlightId: highlight.id,
        }),
      });

      expect(response.status).toBe(200);

      // Verify association removed
      const association = await getHighlightTheme(highlight.id, theme.id);
      expect(association).toBeNull();

      // But highlight itself should still exist
      const existingHighlight = await getTestHighlight(highlight.id);
      expect(existingHighlight).not.toBeNull();
    });
  });
});
