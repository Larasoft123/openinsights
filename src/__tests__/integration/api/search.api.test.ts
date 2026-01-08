/**
 * Semantic Search API - Integration Tests
 *
 * Tests the /api/projects/[projectId]/search endpoint.
 * Requires database with pgvector extension.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  setupTestDatabase,
  teardownTestDatabase,
  clearTestData,
  seedTestData,
  addTestEmbeddings,
  generateTestEmbedding,
  type TestSeedData,
} from '../setup';

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

    const embeddings = testData.segments.map((_, i) => generateTestEmbedding(i + 1));
    await addTestEmbeddings(
      testData.segments.map((s) => s.id),
      embeddings
    );
  });

  describe('POST /api/projects/[projectId]/search', () => {
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
