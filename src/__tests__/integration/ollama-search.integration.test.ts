/**
 * Ollama Semantic Search - Real Integration Test
 *
 * Tests semantic search with REAL Ollama embeddings (no mocks).
 * Requires:
 * - Ollama running on localhost:11434
 * - nomic-embed-text model pulled
 * - PostgreSQL with pgvector running
 *
 * Run with: pnpm test src/__tests__/integration/ollama-search.integration.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Pool } from 'pg';
import { OllamaProvider } from '../../lib/ai/providers/ollama.provider';

// Test database connection
const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ||
  'postgresql://openinsights:openinsights_dev@localhost:5433/openinsights';

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';

// Test schema - use a dedicated schema for this test
const TEST_SCHEMA = 'ollama_search_test';
const EMBEDDING_DIMENSION = 768;

let pool: Pool;
let ollamaProvider: OllamaProvider;
let ollamaAvailable = false;
let dbAvailable = false;

describe('Ollama Semantic Search Integration', () => {
  beforeAll(async () => {
    // Check Ollama availability
    try {
      const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`);
      if (response.ok) {
        const data = await response.json();
        const hasNomicEmbed = data.models?.some((m: { name: string }) =>
          m.name.includes('nomic-embed-text')
        );
        if (hasNomicEmbed) {
          ollamaAvailable = true;
          ollamaProvider = new OllamaProvider({
            baseUrl: OLLAMA_BASE_URL,
            embeddingModel: 'nomic-embed-text',
          });
        } else {
          console.warn('Skipping tests: nomic-embed-text model not installed');
        }
      }
    } catch {
      console.warn('Skipping tests: Ollama not available');
    }

    if (!ollamaAvailable) return;

    // Setup database
    try {
      pool = new Pool({ connectionString: TEST_DATABASE_URL, max: 5 });

      // Create test schema
      const client = await pool.connect();
      try {
        // Ensure pgvector extension exists
        await client.query('CREATE EXTENSION IF NOT EXISTS vector');

        await client.query(`DROP SCHEMA IF EXISTS ${TEST_SCHEMA} CASCADE`);
        await client.query(`CREATE SCHEMA ${TEST_SCHEMA}`);
        // Include public for pgvector types
        await client.query(`SET search_path TO ${TEST_SCHEMA}, public`);

        // Create minimal test table
        await client.query(`
          CREATE TABLE segments (
            id SERIAL PRIMARY KEY,
            content TEXT NOT NULL,
            embedding vector(${EMBEDDING_DIMENSION})
          )
        `);

        // Create HNSW index for fast similarity search
        await client.query(`
          CREATE INDEX segments_embedding_idx
          ON segments USING hnsw (embedding vector_cosine_ops)
        `);

        await client.query('SET search_path TO public');
        dbAvailable = true;
      } finally {
        client.release();
      }
    } catch (error) {
      console.warn('Skipping tests: Database not available', error);
    }
  });

  afterAll(async () => {
    if (pool) {
      // Clean up test schema
      try {
        await pool.query(`DROP SCHEMA IF EXISTS ${TEST_SCHEMA} CASCADE`);
      } catch {
        // Ignore cleanup errors
      }
      await pool.end();
    }
  });

  it('should generate embeddings with correct dimensions', async () => {
    if (!ollamaAvailable) {
      console.log('Skipping: Ollama not available');
      return;
    }

    const result = await ollamaProvider.embed(['Hello world']);

    expect(result.embeddings).toHaveLength(1);
    expect(result.embeddings[0]).toHaveLength(EMBEDDING_DIMENSION);
    expect(result.model).toBe('nomic-embed-text');
    expect(result.dimensions).toBe(EMBEDDING_DIMENSION);
  });

  it('should generate different embeddings for different texts', async () => {
    if (!ollamaAvailable) {
      console.log('Skipping: Ollama not available');
      return;
    }

    const result = await ollamaProvider.embed([
      'The weather is sunny today',
      'Quantum physics is complex',
    ]);

    expect(result.embeddings).toHaveLength(2);

    // Calculate cosine similarity
    const dot = result.embeddings[0].reduce(
      (sum, val, i) => sum + val * result.embeddings[1][i],
      0
    );
    const mag1 = Math.sqrt(result.embeddings[0].reduce((sum, val) => sum + val * val, 0));
    const mag2 = Math.sqrt(result.embeddings[1].reduce((sum, val) => sum + val * val, 0));
    const similarity = dot / (mag1 * mag2);

    // Different topics should have low similarity
    expect(similarity).toBeLessThan(0.8);
  });

  it('should generate similar embeddings for similar texts', async () => {
    if (!ollamaAvailable) {
      console.log('Skipping: Ollama not available');
      return;
    }

    const result = await ollamaProvider.embed([
      'The checkout process is frustrating',
      'The payment flow is confusing and difficult',
    ]);

    expect(result.embeddings).toHaveLength(2);

    // Calculate cosine similarity
    const dot = result.embeddings[0].reduce(
      (sum, val, i) => sum + val * result.embeddings[1][i],
      0
    );
    const mag1 = Math.sqrt(result.embeddings[0].reduce((sum, val) => sum + val * val, 0));
    const mag2 = Math.sqrt(result.embeddings[1].reduce((sum, val) => sum + val * val, 0));
    const similarity = dot / (mag1 * mag2);

    // Similar topics should have higher similarity
    expect(similarity).toBeGreaterThan(0.5);
  });

  it('should perform semantic search in database', async () => {
    if (!ollamaAvailable || !dbAvailable) {
      console.log('Skipping: Ollama or database not available');
      return;
    }

    // Test content - diverse topics
    const testContent = [
      'The checkout process is really frustrating and confusing',
      'I love the search functionality, it helps me find products quickly',
      'The mobile app crashes frequently when adding items to cart',
      'Customer support was very helpful with my order issues',
      'I wish there was a way to save favorite items for later',
    ];

    // Generate embeddings for all content
    const embeddingResult = await ollamaProvider.embed(testContent);

    // Insert into database
    const client = await pool.connect();
    try {
      await client.query(`SET search_path TO ${TEST_SCHEMA}, public`);

      for (let i = 0; i < testContent.length; i++) {
        const vectorString = `[${embeddingResult.embeddings[i].join(',')}]`;
        await client.query('INSERT INTO segments (content, embedding) VALUES ($1, $2::vector)', [
          testContent[i],
          vectorString,
        ]);
      }

      // Search for "payment problems" - should find checkout-related content
      const searchQuery = 'payment problems during checkout';
      const searchEmbedding = await ollamaProvider.embed([searchQuery]);
      const searchVector = `[${searchEmbedding.embeddings[0].join(',')}]`;

      const results = await client.query(
        `SELECT
          content,
          1 - (embedding <=> $1::vector) as similarity
        FROM segments
        WHERE embedding IS NOT NULL
        ORDER BY embedding <=> $1::vector
        LIMIT 3`,
        [searchVector]
      );

      await client.query('SET search_path TO public');

      // Verify results
      expect(results.rows.length).toBeGreaterThan(0);

      // First result should be checkout-related (highest similarity)
      const topResult = results.rows[0];
      expect(topResult.content.toLowerCase()).toContain('checkout');
      expect(topResult.similarity).toBeGreaterThan(0.4);

      // Results should be ordered by similarity (descending)
      for (let i = 1; i < results.rows.length; i++) {
        expect(results.rows[i - 1].similarity).toBeGreaterThanOrEqual(results.rows[i].similarity);
      }

      console.log('Search results for "payment problems during checkout":');
      results.rows.forEach((row: { content: string; similarity: number }, i: number) => {
        console.log(
          `  ${i + 1}. [${row.similarity.toFixed(3)}] ${row.content.substring(0, 60)}...`
        );
      });
    } finally {
      client.release();
    }
  });

  it('should find semantically related content across different phrasings', async () => {
    if (!ollamaAvailable || !dbAvailable) {
      console.log('Skipping: Ollama or database not available');
      return;
    }

    const client = await pool.connect();
    try {
      await client.query(`SET search_path TO ${TEST_SCHEMA}, public`);

      // Search for "app bugs" - should find mobile app crashes content
      const searchQuery = 'mobile application bugs and errors';
      const searchEmbedding = await ollamaProvider.embed([searchQuery]);
      const searchVector = `[${searchEmbedding.embeddings[0].join(',')}]`;

      const results = await client.query(
        `SELECT
          content,
          1 - (embedding <=> $1::vector) as similarity
        FROM segments
        WHERE embedding IS NOT NULL
          AND 1 - (embedding <=> $1::vector) > 0.3
        ORDER BY embedding <=> $1::vector
        LIMIT 3`,
        [searchVector]
      );

      await client.query('SET search_path TO public');

      expect(results.rows.length).toBeGreaterThan(0);

      // Should find the mobile app crashes content
      const foundCrashes = results.rows.some((row: { content: string }) =>
        row.content.toLowerCase().includes('crash')
      );
      expect(foundCrashes).toBe(true);

      console.log('Search results for "mobile application bugs and errors":');
      results.rows.forEach((row: { content: string; similarity: number }, i: number) => {
        console.log(
          `  ${i + 1}. [${row.similarity.toFixed(3)}] ${row.content.substring(0, 60)}...`
        );
      });
    } finally {
      client.release();
    }
  });

  it('should handle empty query gracefully', async () => {
    if (!ollamaAvailable) {
      console.log('Skipping: Ollama not available');
      return;
    }

    const result = await ollamaProvider.embed([]);
    expect(result.embeddings).toHaveLength(0);
  });
});
