/**
 * Integration Test Setup
 *
 * This file sets up the test environment for integration tests that need
 * a real PostgreSQL database with pgvector extension.
 *
 * Architecture:
 * - Auth data (users, orgs) lives in PUBLIC schema (Prisma)
 * - Business data (workspaces, projects, sources) lives in TENANT_TEST schema (SQL)
 *
 * Requirements:
 * - Docker containers running (postgres with pgvector)
 * - TEST_DATABASE_URL environment variable set
 */

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { execSync } from 'child_process';
import { readFile } from 'fs/promises';
import { join } from 'path';

// Test schema name - all business data goes here
export const TEST_SCHEMA = 'tenant_test';

// Embedding dimension - always 768 (Ollama nomic-embed-text)
export const TEST_EMBEDDING_DIMENSION = 768;

// Use a separate test database
const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ||
  'postgresql://openinsights:openinsights_dev@localhost:5433/openinsights_test';

// Create a Prisma client for tests (auth tables in public schema)
const adapter = new PrismaPg({ connectionString: TEST_DATABASE_URL });

export const testPrisma = new PrismaClient({
  adapter,
  log: ['error'],
});

// Connection pool for raw SQL operations on tenant_test schema
export const testPool = new Pool({
  connectionString: TEST_DATABASE_URL,
  max: 5,
  idleTimeoutMillis: 30000,
});

/**
 * Setup test database before all tests
 * Creates the database if it doesn't exist, runs Prisma migrations for public schema,
 * and creates tenant_test schema from SQL template.
 */
export async function setupTestDatabase(): Promise<void> {
  // Create test database if it doesn't exist
  try {
    execSync(
      `docker exec openinsights-postgres psql -U openinsights -d postgres -c "CREATE DATABASE openinsights_test;" 2>/dev/null || true`,
      { stdio: 'pipe' }
    );

    // Enable pgvector extension
    execSync(
      `docker exec openinsights-postgres psql -U openinsights -d openinsights_test -c "CREATE EXTENSION IF NOT EXISTS vector;"`,
      { stdio: 'pipe' }
    );
  } catch {
    // Database might already exist, continue
  }

  // Sync Prisma schema to test database (auth tables in public schema)
  execSync(`DATABASE_URL="${TEST_DATABASE_URL}" pnpm exec prisma db push --accept-data-loss`, {
    stdio: 'pipe',
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
  });

  // Create tenant_test schema from SQL template (768-dimension embeddings are hardcoded)
  const client = await testPool.connect();
  try {
    // Drop existing tenant_test schema if exists (clean slate)
    await client.query(`DROP SCHEMA IF EXISTS ${TEST_SCHEMA} CASCADE`);

    // Read template and create schema
    const templatePath = join(process.cwd(), 'prisma', 'tenant-schema.sql');
    const template = await readFile(templatePath, 'utf-8');
    const sql = template.replace(/\{\{schema_name\}\}/g, TEST_SCHEMA);

    await client.query(sql);
  } finally {
    client.release();
  }
}

/**
 * Clean up test database after all tests
 */
export async function teardownTestDatabase(): Promise<void> {
  await testPrisma.$disconnect();
  await testPool.end();
}

/**
 * Clear all data from test database (run between tests)
 * Truncates tenant_test schema tables and auth tables in public schema.
 */
export async function clearTestData(): Promise<void> {
  const client = await testPool.connect();
  try {
    // Clear tenant_test schema tables (CASCADE handles FK order)
    await client.query(`SET search_path TO ${TEST_SCHEMA}, public`);
    await client.query(`TRUNCATE
      highlight_themes,
      highlights,
      themes,
      tags,
      speaker_names,
      share_links,
      metadata_values,
      metadata_fields,
      transcript_segments,
      sources,
      projects,
      workspace_members,
      workspaces
      CASCADE`);
    await client.query('SET search_path TO public');
  } finally {
    client.release();
  }

  // Clear auth tables in public schema (Prisma)
  await testPrisma.session.deleteMany();
  await testPrisma.account.deleteMany();
  await testPrisma.organizationMember.deleteMany();
  await testPrisma.user.deleteMany();
  await testPrisma.organization.deleteMany();
}

/**
 * Seed test data for a project with sources, segments, and embeddings
 */
export interface TestSeedData {
  workspace: { id: string; name: string; slug: string };
  user: { id: string; email: string };
  project: { id: string; name: string; workspaceId: string };
  source: { id: string; title: string };
  segments: Array<{ id: string; content: string; embedding?: number[] }>;
  tags: Array<{ id: string; name: string; color: string }>;
}

export async function seedTestData(): Promise<TestSeedData> {
  // 1. Create test user in public schema (Prisma)
  const user = await testPrisma.user.create({
    data: {
      email: 'test@example.com',
      name: 'Test User',
    },
  });

  // 2. Create organization for multi-tenant auth (uses tenant_test schema)
  const org = await testPrisma.organization.upsert({
    where: { id: 'test-org' },
    update: {},
    create: {
      id: 'test-org',
      name: 'Test Organization',
      slug: 'test-org',
      schemaName: TEST_SCHEMA, // Points to tenant_test schema
    },
  });

  // 3. Create organization membership
  await testPrisma.organizationMember.upsert({
    where: {
      organizationId_userId: {
        organizationId: org.id,
        userId: user.id,
      },
    },
    update: {},
    create: {
      organizationId: org.id,
      userId: user.id,
      role: 'OWNER',
      joinedAt: new Date(),
    },
  });

  // 4. Create business data in tenant_test schema (raw SQL)
  const client = await testPool.connect();
  try {
    await client.query(`SET search_path TO ${TEST_SCHEMA}, public`);

    // Create workspace
    const workspaceResult = await client.query(
      `INSERT INTO workspaces (name, slug) VALUES ($1, $2) RETURNING id, name, slug`,
      ['Test Workspace', 'test-workspace']
    );
    const workspace = workspaceResult.rows[0];

    // Add user as workspace member
    await client.query(
      `INSERT INTO workspace_members (workspace_id, user_id, role) VALUES ($1, $2, $3)`,
      [workspace.id, user.id, 'owner']
    );

    // Create project
    const projectResult = await client.query(
      `INSERT INTO projects (workspace_id, name) VALUES ($1, $2) RETURNING id, name, workspace_id`,
      [workspace.id, 'Test Project']
    );
    const project = projectResult.rows[0];

    // Create source
    const sourceResult = await client.query(
      `INSERT INTO sources (project_id, title, file_name, file_url, file_type, duration, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, title`,
      [
        project.id,
        'Test Interview',
        'test-interview.mp4',
        'https://example.com/test-interview.mp4',
        'video/mp4',
        3600,
        'COMPLETED',
      ]
    );
    const source = sourceResult.rows[0];

    // Create tags
    const tag1Result = await client.query(
      `INSERT INTO tags (project_id, name, color) VALUES ($1, $2, $3) RETURNING id, name, color`,
      [project.id, 'Pain Point', '#EF4444']
    );
    const tag2Result = await client.query(
      `INSERT INTO tags (project_id, name, color) VALUES ($1, $2, $3) RETURNING id, name, color`,
      [project.id, 'Feature Request', '#3B82F6']
    );
    const tags = [tag1Result.rows[0], tag2Result.rows[0]];

    // Create segments with diverse content for semantic search testing
    const segmentData = [
      {
        content:
          'The checkout process is really frustrating. I always get confused at the payment step.',
        startTime: 0,
        endTime: 5,
      },
      {
        content: 'I love the search functionality. It helps me find products quickly.',
        startTime: 5,
        endTime: 10,
      },
      {
        content: 'The mobile app crashes frequently when I try to add items to cart.',
        startTime: 10,
        endTime: 15,
      },
      {
        content: 'Customer support was very helpful when I had issues with my order.',
        startTime: 15,
        endTime: 20,
      },
      {
        content: 'I wish there was a way to save my favorite items for later.',
        startTime: 20,
        endTime: 25,
      },
    ];

    const segments: Array<{ id: string; content: string }> = [];
    for (const data of segmentData) {
      const result = await client.query(
        `INSERT INTO transcript_segments (source_id, content, start_time, end_time)
         VALUES ($1, $2, $3, $4) RETURNING id, content`,
        [source.id, data.content, data.startTime, data.endTime]
      );
      segments.push(result.rows[0]);
    }

    await client.query('SET search_path TO public');

    return {
      workspace: { id: workspace.id, name: workspace.name, slug: workspace.slug },
      user: { id: user.id, email: user.email },
      project: { id: project.id, name: project.name, workspaceId: workspace.id },
      source: { id: source.id, title: source.title },
      segments,
      tags,
    };
  } finally {
    client.release();
  }
}

/**
 * Add embeddings to test segments using raw SQL
 * This simulates what the vectorization worker does
 */
export async function addTestEmbeddings(
  segmentIds: string[],
  embeddings: number[][]
): Promise<void> {
  const client = await testPool.connect();
  try {
    await client.query(`SET search_path TO ${TEST_SCHEMA}, public`);
    for (let i = 0; i < segmentIds.length; i++) {
      const vectorString = `[${embeddings[i].join(',')}]`;
      await client.query(`UPDATE transcript_segments SET embedding = $1::vector WHERE id = $2`, [
        vectorString,
        segmentIds[i],
      ]);
    }
    await client.query('SET search_path TO public');
  } finally {
    client.release();
  }
}

/**
 * Generate a simple test embedding (not semantically meaningful, just for testing)
 * Uses fixed TEST_EMBEDDING_DIMENSION for deterministic tests.
 * Real tests should use actual embeddings or pre-computed fixtures.
 */
export function generateTestEmbedding(seed: number): number[] {
  const embedding: number[] = [];
  for (let i = 0; i < TEST_EMBEDDING_DIMENSION; i++) {
    // Deterministic pseudo-random values based on seed
    embedding.push(Math.sin(seed * (i + 1)) * 0.5);
  }
  // Normalize to unit vector
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  return embedding.map((val) => val / magnitude);
}

/**
 * Create a mock session object for API testing
 * Use this with vi.mock to mock the auth() function
 *
 * Includes multi-tenant fields for requireTenantAuth() compatibility.
 * Tests use schemaName='tenant_test' since test data is in tenant_test schema.
 */
export function createMockSession(testData: TestSeedData) {
  return {
    user: {
      id: testData.user.id,
      email: testData.user.email,
      name: 'Test User',
      // Multi-tenant fields - using tenant_test schema
      organizations: [
        {
          id: 'test-org',
          name: 'Test Organization',
          slug: 'test-org',
          schemaName: TEST_SCHEMA,
          role: 'OWNER' as const,
        },
      ],
      currentOrgId: 'test-org',
      currentOrgSlug: 'test-org',
      currentSchemaName: TEST_SCHEMA,
      currentRole: 'OWNER' as const,
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };
}

/**
 * Create another workspace with a separate user for isolation tests.
 * Returns data needed to create a mock session for the other user.
 */
export async function createOtherUserWithWorkspace(): Promise<{
  user: { id: string; email: string };
  workspace: { id: string; name: string; slug: string };
  org: { id: string; name: string; slug: string };
}> {
  // Create user in public schema
  const otherUser = await testPrisma.user.create({
    data: {
      email: 'other@example.com',
      name: 'Other User',
    },
  });

  // Use the existing test organization (same schema for workspace isolation tests)
  // We can't create a new org with the same schemaName due to unique constraint
  const otherOrg = await testPrisma.organization.upsert({
    where: { id: 'test-org' },
    update: {},
    create: {
      id: 'test-org',
      name: 'Test Organization',
      slug: 'test-org',
      schemaName: TEST_SCHEMA,
    },
  });

  // Create membership (upsert to handle already existing)
  await testPrisma.organizationMember.upsert({
    where: {
      organizationId_userId: {
        organizationId: otherOrg.id,
        userId: otherUser.id,
      },
    },
    update: {},
    create: {
      organizationId: otherOrg.id,
      userId: otherUser.id,
      role: 'MEMBER',
      joinedAt: new Date(),
    },
  });

  // Create workspace in tenant_test schema
  const client = await testPool.connect();
  try {
    await client.query(`SET search_path TO ${TEST_SCHEMA}, public`);

    const workspaceResult = await client.query(
      `INSERT INTO workspaces (name, slug) VALUES ($1, $2) RETURNING id, name, slug`,
      ['Other Workspace', 'other-workspace']
    );
    const otherWorkspace = workspaceResult.rows[0];

    // Add user as workspace member
    await client.query(
      `INSERT INTO workspace_members (workspace_id, user_id, role) VALUES ($1, $2, $3)`,
      [otherWorkspace.id, otherUser.id, 'owner']
    );

    await client.query('SET search_path TO public');

    return {
      user: { id: otherUser.id, email: otherUser.email },
      workspace: {
        id: otherWorkspace.id,
        name: otherWorkspace.name,
        slug: otherWorkspace.slug,
      },
      org: { id: otherOrg.id, name: otherOrg.name, slug: otherOrg.slug },
    };
  } finally {
    client.release();
  }
}

/**
 * Create a project in the specified workspace (within tenant_test schema).
 */
export async function createTestProject(
  workspaceId: string,
  name: string
): Promise<{ id: string; name: string }> {
  const client = await testPool.connect();
  try {
    await client.query(`SET search_path TO ${TEST_SCHEMA}, public`);
    const result = await client.query(
      `INSERT INTO projects (workspace_id, name) VALUES ($1, $2) RETURNING id, name`,
      [workspaceId, name]
    );
    await client.query('SET search_path TO public');
    return result.rows[0];
  } finally {
    client.release();
  }
}

/**
 * Create a theme in the tenant_test schema.
 */
export async function createTestTheme(
  projectId: string,
  name: string,
  options?: { description?: string; color?: string }
): Promise<{
  id: string;
  name: string;
  color: string;
  description: string | null;
  projectId: string;
}> {
  const client = await testPool.connect();
  try {
    await client.query(`SET search_path TO ${TEST_SCHEMA}, public`);
    const result = await client.query(
      `INSERT INTO themes (project_id, name, description, color)
       VALUES ($1, $2, $3, $4) RETURNING id, project_id, name, description, color`,
      [projectId, name, options?.description || null, options?.color || '#6366F1']
    );
    await client.query('SET search_path TO public');
    const row = result.rows[0];
    return {
      id: row.id,
      projectId: row.project_id,
      name: row.name,
      description: row.description,
      color: row.color,
    };
  } finally {
    client.release();
  }
}

/**
 * Create a highlight in the tenant_test schema.
 */
export async function createTestHighlight(
  segmentId: string,
  tagId: string,
  options?: { note?: string; selectedText?: string }
): Promise<{ id: string; segmentId: string; tagId: string; note: string | null }> {
  const client = await testPool.connect();
  try {
    await client.query(`SET search_path TO ${TEST_SCHEMA}, public`);
    const result = await client.query(
      `INSERT INTO highlights (segment_id, tag_id, note, selected_text)
       VALUES ($1, $2, $3, $4) RETURNING id, segment_id, tag_id, note`,
      [segmentId, tagId, options?.note || null, options?.selectedText || null]
    );
    await client.query('SET search_path TO public');
    const row = result.rows[0];
    return {
      id: row.id,
      segmentId: row.segment_id,
      tagId: row.tag_id,
      note: row.note,
    };
  } finally {
    client.release();
  }
}

/**
 * Add highlight to theme in the tenant_test schema.
 */
export async function addHighlightToTheme(highlightId: string, themeId: string): Promise<void> {
  const client = await testPool.connect();
  try {
    await client.query(`SET search_path TO ${TEST_SCHEMA}, public`);
    await client.query(`INSERT INTO highlight_themes (highlight_id, theme_id) VALUES ($1, $2)`, [
      highlightId,
      themeId,
    ]);
    await client.query('SET search_path TO public');
  } finally {
    client.release();
  }
}

/**
 * Get theme from tenant_test schema by ID.
 */
export async function getTestTheme(themeId: string): Promise<{ id: string; name: string } | null> {
  const client = await testPool.connect();
  try {
    await client.query(`SET search_path TO ${TEST_SCHEMA}, public`);
    const result = await client.query(`SELECT id, name FROM themes WHERE id = $1`, [themeId]);
    await client.query('SET search_path TO public');
    return result.rows.length > 0 ? result.rows[0] : null;
  } finally {
    client.release();
  }
}

/**
 * Get highlight-theme association from tenant_test schema.
 */
export async function getHighlightTheme(
  highlightId: string,
  themeId: string
): Promise<{ highlightId: string; themeId: string } | null> {
  const client = await testPool.connect();
  try {
    await client.query(`SET search_path TO ${TEST_SCHEMA}, public`);
    const result = await client.query(
      `SELECT highlight_id, theme_id FROM highlight_themes WHERE highlight_id = $1 AND theme_id = $2`,
      [highlightId, themeId]
    );
    await client.query('SET search_path TO public');
    if (result.rows.length === 0) return null;
    return { highlightId: result.rows[0].highlight_id, themeId: result.rows[0].theme_id };
  } finally {
    client.release();
  }
}

/**
 * Get highlight from tenant_test schema.
 */
export async function getTestHighlight(highlightId: string): Promise<{ id: string } | null> {
  const client = await testPool.connect();
  try {
    await client.query(`SET search_path TO ${TEST_SCHEMA}, public`);
    const result = await client.query(`SELECT id FROM highlights WHERE id = $1`, [highlightId]);
    await client.query('SET search_path TO public');
    return result.rows.length > 0 ? result.rows[0] : null;
  } finally {
    client.release();
  }
}

/**
 * Store the current mock session - set by tests, read by mocked auth()
 */
export let mockSession: ReturnType<typeof createMockSession> | null = null;

/**
 * Set the mock session for the current test
 */
export function setMockSession(session: ReturnType<typeof createMockSession> | null) {
  mockSession = session;
}

/**
 * Mock auth function that returns the current mockSession
 * Use with vi.mock('@/lib/auth', () => ({ auth: mockAuth }))
 */
export async function mockAuth() {
  return mockSession;
}
