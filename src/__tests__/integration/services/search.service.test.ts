/**
 * Semantic Search Service - Integration Tests
 *
 * TDD: These tests define the expected behavior of the search service.
 * Run with: pnpm test src/__tests__/integration/services/search.service.test.ts
 *
 * Requirements:
 * - Docker containers running (postgres with pgvector)
 * - Real embeddings or test fixtures
 *
 * These tests are skipped when the database is not available.
 * They run in CI where Docker is properly configured.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  testPrisma,
  setupTestDatabase,
  teardownTestDatabase,
  clearTestData,
  seedTestData,
  addTestEmbeddings,
  generateTestEmbedding,
  type TestSeedData,
} from '../setup';

import { semanticSearch } from '@/lib/services/search.service';

// Check if database is available
let dbAvailable = false;

describe('Semantic Search Service', () => {
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

    // Add embeddings to test segments
    // Using deterministic test embeddings for reproducibility
    const embeddings = testData.segments.map((_, i) => generateTestEmbedding(i + 1));
    await addTestEmbeddings(
      testData.segments.map((s) => s.id),
      embeddings
    );
  });

  describe('semanticSearch', () => {
    it('should return empty array for empty query', async () => {
      if (!dbAvailable) return;
      const results = await semanticSearch({
        prismaClient: testPrisma,
        projectId: testData.project.id,
        query: '',
      });

      expect(results).toEqual([]);
    });

    it('should return empty array for whitespace-only query', async () => {
      if (!dbAvailable) return;
      const results = await semanticSearch({
        prismaClient: testPrisma,
        projectId: testData.project.id,
        query: '   ',
      });

      expect(results).toEqual([]);
    });

    it('should return results with correct structure', async () => {
      if (!dbAvailable) return;
      // Use a query embedding similar to segment 1 (checkout frustration)
      const queryEmbedding = generateTestEmbedding(1);
      const results = await semanticSearch({
        prismaClient: testPrisma,
        projectId: testData.project.id,
        query: 'checkout frustration',
        queryEmbedding,
        minSimilarity: 0.0, // Lower threshold for test embeddings
      });

      // Should return some results
      expect(results.length).toBeGreaterThan(0);

      // Check result structure
      const result = results[0];
      expect(result).toHaveProperty('segmentId');
      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('startTime');
      expect(result).toHaveProperty('endTime');
      expect(result).toHaveProperty('sourceId');
      expect(result).toHaveProperty('sourceTitle');
      expect(result).toHaveProperty('similarity');

      // Similarity should be a number between 0 and 1
      expect(typeof result.similarity).toBe('number');
      expect(result.similarity).toBeGreaterThanOrEqual(0);
      expect(result.similarity).toBeLessThanOrEqual(1);
    });

    it('should only return segments from the specified project', async () => {
      if (!dbAvailable) return;
      // Create another project with segments
      const otherProject = await testPrisma.project.create({
        data: {
          name: 'Other Project',
          workspaceId: testData.workspace.id,
        },
      });

      const otherSource = await testPrisma.source.create({
        data: {
          title: 'Other Source',
          fileName: 'other.mp4',
          fileUrl: 'https://example.com/other.mp4',
          fileType: 'video/mp4',
          status: 'COMPLETED',
          projectId: otherProject.id,
        },
      });

      const otherSegment = await testPrisma.transcriptSegment.create({
        data: {
          content: 'This is from another project',
          startTime: 0,
          endTime: 5,
          sourceId: otherSource.id,
        },
      });

      // Add embedding to other segment
      await addTestEmbeddings([otherSegment.id], [generateTestEmbedding(100)]);

      // Search in original project
      const queryEmbedding = generateTestEmbedding(1);
      const results = await semanticSearch({
        prismaClient: testPrisma,
        projectId: testData.project.id,
        query: 'test query',
        queryEmbedding,
        minSimilarity: 0.0,
      });

      // All results should be from original project
      for (const result of results) {
        expect(result.sourceId).toBe(testData.source.id);
      }
    });

    it('should respect the limit parameter', async () => {
      if (!dbAvailable) return;
      const queryEmbedding = generateTestEmbedding(1);
      const results = await semanticSearch({
        prismaClient: testPrisma,
        projectId: testData.project.id,
        query: 'test query',
        queryEmbedding,
        limit: 2,
        minSimilarity: 0.0,
      });

      expect(results.length).toBeLessThanOrEqual(2);
    });

    it('should filter by minimum similarity', async () => {
      if (!dbAvailable) return;
      const queryEmbedding = generateTestEmbedding(1);
      const results = await semanticSearch({
        prismaClient: testPrisma,
        projectId: testData.project.id,
        query: 'test query',
        queryEmbedding,
        minSimilarity: 0.9, // Very high threshold
      });

      // With random embeddings and high threshold, likely no results
      for (const result of results) {
        expect(result.similarity).toBeGreaterThan(0.9);
      }
    });

    it('should return results ordered by similarity (descending)', async () => {
      if (!dbAvailable) return;
      const queryEmbedding = generateTestEmbedding(1);
      const results = await semanticSearch({
        prismaClient: testPrisma,
        projectId: testData.project.id,
        query: 'test query',
        queryEmbedding,
        minSimilarity: 0.0,
      });

      if (results.length > 1) {
        for (let i = 1; i < results.length; i++) {
          expect(results[i - 1].similarity).toBeGreaterThanOrEqual(results[i].similarity);
        }
      }
    });

    it('should not return segments without embeddings', async () => {
      if (!dbAvailable) return;
      // Create a segment without embedding
      const segmentWithoutEmbedding = await testPrisma.transcriptSegment.create({
        data: {
          content: 'Segment without embedding',
          startTime: 100,
          endTime: 105,
          sourceId: testData.source.id,
        },
      });

      const queryEmbedding = generateTestEmbedding(1);
      const results = await semanticSearch({
        prismaClient: testPrisma,
        projectId: testData.project.id,
        query: 'test query',
        queryEmbedding,
        minSimilarity: 0.0,
      });

      // Should not include segment without embedding
      const segmentIds = results.map((r) => r.segmentId);
      expect(segmentIds).not.toContain(segmentWithoutEmbedding.id);
    });

    it('should include source title in results', async () => {
      if (!dbAvailable) return;
      const queryEmbedding = generateTestEmbedding(1);
      const results = await semanticSearch({
        prismaClient: testPrisma,
        projectId: testData.project.id,
        query: 'test query',
        queryEmbedding,
        minSimilarity: 0.0,
      });

      if (results.length > 0) {
        expect(results[0].sourceTitle).toBe('Test Interview');
      }
    });
  });
});
