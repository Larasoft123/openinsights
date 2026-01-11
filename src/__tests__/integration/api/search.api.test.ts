/**
 * Semantic Search API - Integration Tests
 *
 * Tests the /api/projects/[projectId]/search endpoint.
 * Requires database with pgvector extension.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import {
  testPrisma,
  setupTestDatabase,
  teardownTestDatabase,
  clearTestData,
  seedTestData,
  addTestEmbeddings,
  generateTestEmbedding,
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

// Mock the AI module to provide test embeddings without requiring API keys
vi.mock('@/lib/ai', () => ({
  getEmbeddingProvider: () => ({
    embed: async () => ({
      embeddings: [generateTestEmbedding(42)], // Use deterministic test embedding
      inputTokens: 10,
    }),
  }),
  getEmbeddingDimensions: () => 1536, // Match test environment (OpenAI dimensions)
  // Workspace-config-aware versions (used by search service)
  getEmbeddingProviderWithConfig: () => ({
    embed: async () => ({
      embeddings: [generateTestEmbedding(42)],
      inputTokens: 10,
    }),
  }),
  getEmbeddingDimensionsWithConfig: () => 1536,
}));

// Check if database is available
let dbAvailable = false;

describe('Search API', () => {
  let testData: TestSeedData;

  beforeAll(async () => {
    try {
      await setupTestDatabase();
      dbAvailable = true;
    } catch {
      console.warn('Skipping API tests: Database not available');
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

    const embeddings = testData.segments.map((_, i) => generateTestEmbedding(i + 1));
    await addTestEmbeddings(
      testData.segments.map((s) => s.id),
      embeddings
    );
  });

  describe('POST /api/projects/[projectId]/search', () => {
    it('should return 401 when not authenticated', async () => {
      if (!dbAvailable) return;

      setMockSession(null);

      const { POST } = await import('@/app/api/projects/[projectId]/search/route');

      const request = new Request('http://localhost/api/projects/test/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: 'test' }),
      });

      const response = await POST(request, {
        params: Promise.resolve({ projectId: testData.project.id }),
      });
      expect(response.status).toBe(401);
    });

    it('should return 400 for missing query', async () => {
      if (!dbAvailable) return;

      // Import the route handler dynamically to test it
      const { POST } = await import('@/app/api/projects/[projectId]/search/route');

      const request = new Request('http://localhost/api/projects/test/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const response = await POST(request, {
        params: Promise.resolve({ projectId: testData.project.id }),
      });
      expect(response.status).toBe(400);
    });

    it('should return search results for valid query', async () => {
      if (!dbAvailable) return;

      const { POST } = await import('@/app/api/projects/[projectId]/search/route');

      const request = new Request('http://localhost/api/projects/test/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: 'checkout process', minSimilarity: 0 }),
      });

      const response = await POST(request, {
        params: Promise.resolve({ projectId: testData.project.id }),
      });
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(Array.isArray(data.results)).toBe(true);
    });

    it('should return empty array for empty query', async () => {
      if (!dbAvailable) return;

      const { POST } = await import('@/app/api/projects/[projectId]/search/route');

      const request = new Request('http://localhost/api/projects/test/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: '' }),
      });

      const response = await POST(request, {
        params: Promise.resolve({ projectId: testData.project.id }),
      });
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.results).toEqual([]);
    });

    it('should respect limit parameter', async () => {
      if (!dbAvailable) return;

      const { POST } = await import('@/app/api/projects/[projectId]/search/route');

      const request = new Request('http://localhost/api/projects/test/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: 'test', limit: 2, minSimilarity: 0 }),
      });

      const response = await POST(request, {
        params: Promise.resolve({ projectId: testData.project.id }),
      });
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.results.length).toBeLessThanOrEqual(2);
    });
  });
});
