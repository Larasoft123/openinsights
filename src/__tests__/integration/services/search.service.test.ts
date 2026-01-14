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
  setupTestDatabase,
  teardownTestDatabase,
  clearTestData,
  seedTestData,
  addTestEmbeddings,
  generateTestEmbedding,
  createTestProject,
  testPool,
  TEST_SCHEMA,
  type TestSeedData,
} from '../setup';

import { semanticSearch } from '@/lib/services/search.service';

// Check if database is available
let dbAvailable = false;

// Test organization ID (matches test setup)
const TEST_ORG_ID = 'test-org';

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
        schemaName: TEST_SCHEMA,
        organizationId: TEST_ORG_ID,
        projectId: testData.project.id,
        query: '',
      });

      expect(results).toEqual([]);
    });

    it('should return empty array for whitespace-only query', async () => {
      if (!dbAvailable) return;
      const results = await semanticSearch({
        schemaName: TEST_SCHEMA,
        organizationId: TEST_ORG_ID,
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
        schemaName: TEST_SCHEMA,
        organizationId: TEST_ORG_ID,
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

      // Create another project with segments in tenant_test schema
      const otherProject = await createTestProject(testData.workspace.id, 'Other Project');

      const client = await testPool.connect();
      try {
        await client.query(`SET search_path TO ${TEST_SCHEMA}, public`);

        // Create source in other project
        const sourceResult = await client.query(
          `INSERT INTO sources (project_id, title, file_name, file_url, file_type, status)
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
          [
            otherProject.id,
            'Other Source',
            'other.mp4',
            'https://example.com/other.mp4',
            'video/mp4',
            'COMPLETED',
          ]
        );
        const otherSourceId = sourceResult.rows[0].id;

        // Create segment in other project
        const segmentResult = await client.query(
          `INSERT INTO transcript_segments (source_id, content, start_time, end_time)
           VALUES ($1, $2, $3, $4) RETURNING id`,
          [otherSourceId, 'This is from another project', 0, 5]
        );
        const otherSegmentId = segmentResult.rows[0].id;

        // Add embedding to other segment
        const vectorString = `[${generateTestEmbedding(100).join(',')}]`;
        await client.query(`UPDATE transcript_segments SET embedding = $1::vector WHERE id = $2`, [
          vectorString,
          otherSegmentId,
        ]);

        await client.query('SET search_path TO public');
      } finally {
        client.release();
      }

      // Search in original project
      const queryEmbedding = generateTestEmbedding(1);
      const results = await semanticSearch({
        schemaName: TEST_SCHEMA,
        organizationId: TEST_ORG_ID,
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
        schemaName: TEST_SCHEMA,
        organizationId: TEST_ORG_ID,
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
        schemaName: TEST_SCHEMA,
        organizationId: TEST_ORG_ID,
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
        schemaName: TEST_SCHEMA,
        organizationId: TEST_ORG_ID,
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

      // Create a segment without embedding in tenant_test schema
      let segmentWithoutEmbeddingId: string;
      const client = await testPool.connect();
      try {
        await client.query(`SET search_path TO ${TEST_SCHEMA}, public`);
        const result = await client.query(
          `INSERT INTO transcript_segments (source_id, content, start_time, end_time)
           VALUES ($1, $2, $3, $4) RETURNING id`,
          [testData.source.id, 'Segment without embedding', 100, 105]
        );
        segmentWithoutEmbeddingId = result.rows[0].id;
        await client.query('SET search_path TO public');
      } finally {
        client.release();
      }

      const queryEmbedding = generateTestEmbedding(1);
      const results = await semanticSearch({
        schemaName: TEST_SCHEMA,
        organizationId: TEST_ORG_ID,
        projectId: testData.project.id,
        query: 'test query',
        queryEmbedding,
        minSimilarity: 0.0,
      });

      // Should not include segment without embedding
      const segmentIds = results.map((r) => r.segmentId);
      expect(segmentIds).not.toContain(segmentWithoutEmbeddingId);
    });

    it('should include source title in results', async () => {
      if (!dbAvailable) return;
      const queryEmbedding = generateTestEmbedding(1);
      const results = await semanticSearch({
        schemaName: TEST_SCHEMA,
        organizationId: TEST_ORG_ID,
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
