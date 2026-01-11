/**
 * Integration Test Setup
 *
 * This file sets up the test environment for integration tests that need
 * a real PostgreSQL database with pgvector extension.
 *
 * Requirements:
 * - Docker containers running (postgres with pgvector)
 * - TEST_DATABASE_URL environment variable set
 */

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { execSync } from 'child_process';
import { getEmbeddingDimensions } from '@/lib/ai/provider';

// Use a separate test database
const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ||
  'postgresql://openinsights:openinsights_dev@localhost:5432/openinsights_test';

// Create a Prisma client for tests using the same adapter pattern as main app
const adapter = new PrismaPg({ connectionString: TEST_DATABASE_URL });

export const testPrisma = new PrismaClient({
  adapter,
  log: ['error'],
});

/**
 * Setup test database before all tests
 * Creates the database if it doesn't exist and runs migrations
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

  // Run migrations on test database
  execSync(`DATABASE_URL="${TEST_DATABASE_URL}" pnpm exec prisma migrate deploy`, {
    stdio: 'pipe',
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
  });

  // Add embedding column with configurable dimensions based on provider
  const dims = getEmbeddingDimensions();
  execSync(
    `docker exec openinsights-postgres psql -U openinsights -d openinsights_test -c "
      DO \\$\\$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'transcript_segments' AND column_name = 'embedding'
        ) THEN
          ALTER TABLE transcript_segments ADD COLUMN embedding vector(${dims});
        END IF;
        DROP INDEX IF EXISTS transcript_segments_embedding_hnsw_idx;
        CREATE INDEX IF NOT EXISTS transcript_segments_embedding_hnsw_idx
          ON transcript_segments USING hnsw (embedding vector_cosine_ops)
          WITH (m = 16, ef_construction = 64);
      END
      \\$\\$;
    "`,
    { stdio: 'pipe' }
  );
}

/**
 * Clean up test database after all tests
 */
export async function teardownTestDatabase(): Promise<void> {
  await testPrisma.$disconnect();
}

/**
 * Clear all data from test database (run between tests)
 */
export async function clearTestData(): Promise<void> {
  // Delete in order to respect foreign key constraints
  await testPrisma.highlightTheme.deleteMany();
  await testPrisma.theme.deleteMany();
  await testPrisma.highlight.deleteMany();
  await testPrisma.transcriptSegment.deleteMany();
  await testPrisma.tag.deleteMany();
  await testPrisma.source.deleteMany();
  await testPrisma.project.deleteMany();
  await testPrisma.session.deleteMany();
  await testPrisma.account.deleteMany();
  // Multi-tenant tables
  await testPrisma.organizationMember.deleteMany();
  await testPrisma.user.deleteMany();
  await testPrisma.organization.deleteMany();
  await testPrisma.workspace.deleteMany();
}

/**
 * Seed test data for a project with sources, segments, and embeddings
 */
export interface TestSeedData {
  workspace: { id: string; name: string; slug: string };
  user: { id: string; email: string };
  project: { id: string; name: string };
  source: { id: string; title: string };
  segments: Array<{ id: string; content: string; embedding?: number[] }>;
  tags: Array<{ id: string; name: string; color: string }>;
}

export async function seedTestData(): Promise<TestSeedData> {
  // Create workspace
  const workspace = await testPrisma.workspace.create({
    data: {
      name: 'Test Workspace',
      slug: 'test-workspace',
    },
  });

  // Create test user with the workspace
  const user = await testPrisma.user.create({
    data: {
      email: 'test@example.com',
      name: 'Test User',
      workspaceId: workspace.id,
    },
  });

  // Create organization for multi-tenant auth
  // Use 'test-org' as ID to match the mock session
  const org = await testPrisma.organization.upsert({
    where: { id: 'test-org' },
    update: {},
    create: {
      id: 'test-org',
      name: 'Test Organization',
      slug: 'test-org',
      schemaName: 'public', // Tests use public schema
    },
  });

  // Create organization membership
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

  // Create project
  const project = await testPrisma.project.create({
    data: {
      name: 'Test Project',
      workspaceId: workspace.id,
    },
  });

  // Create source
  const source = await testPrisma.source.create({
    data: {
      title: 'Test Interview',
      fileName: 'test-interview.mp4',
      fileUrl: 'https://example.com/test-interview.mp4',
      fileType: 'video/mp4',
      duration: 3600,
      status: 'COMPLETED',
      projectId: project.id,
    },
  });

  // Create tags
  const tags = await Promise.all([
    testPrisma.tag.create({
      data: {
        name: 'Pain Point',
        color: '#EF4444',
        projectId: project.id,
      },
    }),
    testPrisma.tag.create({
      data: {
        name: 'Feature Request',
        color: '#3B82F6',
        projectId: project.id,
      },
    }),
  ]);

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

  const segments = await Promise.all(
    segmentData.map((data) =>
      testPrisma.transcriptSegment.create({
        data: {
          ...data,
          sourceId: source.id,
        },
      })
    )
  );

  return {
    workspace: { id: workspace.id, name: workspace.name, slug: workspace.slug },
    user: { id: user.id, email: user.email },
    project: { id: project.id, name: project.name },
    source: { id: source.id, title: source.title },
    segments: segments.map((s) => ({ id: s.id, content: s.content })),
    tags: tags.map((t) => ({ id: t.id, name: t.name, color: t.color })),
  };
}

/**
 * Add embeddings to test segments using raw SQL
 * This simulates what the vectorization worker does
 */
export async function addTestEmbeddings(
  segmentIds: string[],
  embeddings: number[][]
): Promise<void> {
  for (let i = 0; i < segmentIds.length; i++) {
    const vectorString = `[${embeddings[i].join(',')}]`;
    await testPrisma.$executeRaw`
      UPDATE transcript_segments
      SET embedding = ${vectorString}::vector
      WHERE id = ${segmentIds[i]}
    `;
  }
}

/**
 * Generate a simple test embedding (not semantically meaningful, just for testing)
 * Uses dimensions from the configured embedding provider.
 * Real tests should use actual embeddings or pre-computed fixtures.
 */
export function generateTestEmbedding(seed: number): number[] {
  const dims = getEmbeddingDimensions();
  const embedding: number[] = [];
  for (let i = 0; i < dims; i++) {
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
 * In tests, we use schemaName='public' since test data is in public schema.
 */
export function createMockSession(testData: TestSeedData) {
  return {
    user: {
      id: testData.user.id,
      email: testData.user.email,
      name: 'Test User',
      // Legacy field
      workspaceId: testData.workspace.id,
      // Multi-tenant fields - using 'public' schema for tests since
      // test data is seeded into public schema via Prisma
      organizations: [
        {
          id: 'test-org',
          name: 'Test Organization',
          slug: 'test-org',
          schemaName: 'public',
          role: 'OWNER' as const,
        },
      ],
      currentOrgId: 'test-org',
      currentOrgSlug: 'test-org',
      currentSchemaName: 'public',
      currentRole: 'OWNER' as const,
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };
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
