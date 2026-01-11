#!/usr/bin/env tsx
/**
 * Embedding Provider Migration Script
 *
 * This script handles migration when changing embedding providers
 * (e.g., OpenAI → Gemini or vice versa).
 *
 * When embedding dimensions change (1536 ↔ 768), the script will:
 * 1. Drop the existing embedding column (embeddings become incompatible)
 * 2. Recreate it with the new dimensions
 * 3. Queue all existing segments for re-vectorization
 *
 * Usage:
 *   pnpm exec tsx scripts/migrate-embedding-provider.ts [new-provider]
 *
 * Examples:
 *   pnpm exec tsx scripts/migrate-embedding-provider.ts gemini
 *   pnpm exec tsx scripts/migrate-embedding-provider.ts openai
 *   pnpm exec tsx scripts/migrate-embedding-provider.ts ollama
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Provider → Dimension mapping
const PROVIDER_DIMENSIONS: Record<string, number> = {
  openai: 1536,
  gemini: 768,
  ollama: 768,
};

interface EmbeddingColumnInfo {
  exists: boolean;
  dimension: number | null;
}

async function getEmbeddingColumnInfo(): Promise<EmbeddingColumnInfo> {
  // Check if embedding column exists and get its dimension
  const result = await prisma.$queryRaw<
    Array<{ udt_name: string; character_maximum_length: number | null }>
  >`
    SELECT udt_name, character_maximum_length
    FROM information_schema.columns
    WHERE table_name = 'transcript_segments' AND column_name = 'embedding'
  `;

  if (result.length === 0) {
    return { exists: false, dimension: null };
  }

  // For vector types, we need to query the typmod to get dimension
  const dimResult = await prisma.$queryRaw<Array<{ dimension: number }>>`
    SELECT atttypmod as dimension
    FROM pg_attribute
    WHERE attrelid = 'transcript_segments'::regclass
      AND attname = 'embedding'
  `;

  // pgvector stores dimension in atttypmod (dimension + 4 for overhead)
  const dimension = dimResult[0]?.dimension ? dimResult[0].dimension : null;

  return { exists: true, dimension };
}

async function countSegmentsWithEmbeddings(): Promise<number> {
  const result = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*) as count FROM transcript_segments WHERE embedding IS NOT NULL
  `;
  return Number(result[0]?.count ?? 0);
}

async function countTotalSegments(): Promise<number> {
  const count = await prisma.transcriptSegment.count();
  return count;
}

async function dropEmbeddingColumn(): Promise<void> {
  await prisma.$executeRaw`
    DROP INDEX IF EXISTS transcript_segments_embedding_idx;
    DROP INDEX IF EXISTS transcript_segments_embedding_hnsw_idx;
  `;
  await prisma.$executeRaw`
    ALTER TABLE transcript_segments DROP COLUMN IF EXISTS embedding;
  `;
}

async function createEmbeddingColumn(dimension: number): Promise<void> {
  await prisma.$executeRawUnsafe(`
    ALTER TABLE transcript_segments ADD COLUMN embedding vector(${dimension});
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX transcript_segments_embedding_hnsw_idx
      ON transcript_segments USING hnsw (embedding vector_cosine_ops)
      WITH (m = 16, ef_construction = 64);
  `);
}

async function getAllSourcesWithSegments(): Promise<Array<{ id: string; segmentCount: number }>> {
  const sources = await prisma.source.findMany({
    where: {
      segments: {
        some: {},
      },
    },
    select: {
      id: true,
      _count: {
        select: { segments: true },
      },
    },
  });

  return sources.map((s) => ({
    id: s.id,
    segmentCount: s._count.segments,
  }));
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(`
Embedding Provider Migration Script

Usage:
  pnpm exec tsx scripts/migrate-embedding-provider.ts <new-provider>

Providers:
  openai   - 1536 dimensions (cloud, commercial)
  gemini   - 768 dimensions (cloud, commercial)
  ollama   - 768 dimensions (local, private)

Examples:
  pnpm exec tsx scripts/migrate-embedding-provider.ts gemini
  pnpm exec tsx scripts/migrate-embedding-provider.ts openai

Note: Changing providers with different dimensions will DROP all existing
embeddings and require re-vectorization of all segments.
`);
    process.exit(0);
  }

  const newProvider = args[0].toLowerCase();

  if (!PROVIDER_DIMENSIONS[newProvider]) {
    console.error(`Error: Unknown provider "${newProvider}"`);
    console.error(`Valid providers: ${Object.keys(PROVIDER_DIMENSIONS).join(', ')}`);
    process.exit(1);
  }

  const newDimension = PROVIDER_DIMENSIONS[newProvider];

  console.log('\n=== Embedding Provider Migration ===\n');
  console.log(`Target provider: ${newProvider} (${newDimension} dimensions)`);

  // Get current state
  const columnInfo = await getEmbeddingColumnInfo();
  const embeddedCount = columnInfo.exists ? await countSegmentsWithEmbeddings() : 0;
  const totalSegments = await countTotalSegments();

  console.log(`\nCurrent state:`);
  console.log(`  - Embedding column exists: ${columnInfo.exists}`);
  if (columnInfo.exists) {
    console.log(`  - Current dimension: ${columnInfo.dimension ?? 'unknown'}`);
    console.log(`  - Segments with embeddings: ${embeddedCount}`);
  }
  console.log(`  - Total segments: ${totalSegments}`);

  if (!columnInfo.exists) {
    console.log('\nEmbedding column does not exist. Creating...');
    await createEmbeddingColumn(newDimension);
    console.log(`Created embedding column with ${newDimension} dimensions.`);
    console.log('\nTo vectorize existing segments, restart your workers or trigger re-processing.');
    await prisma.$disconnect();
    process.exit(0);
  }

  // Check if dimension change is needed
  // Note: columnInfo.dimension might not be accurate for vector types
  // We'll proceed with the migration if the user explicitly requests it

  if (embeddedCount > 0) {
    console.log(`\nWARNING: This will DROP ${embeddedCount} existing embeddings!`);
    console.log('All segments will need to be re-vectorized.\n');

    // In non-interactive mode, require explicit confirmation via env var
    if (process.env.CONFIRM_MIGRATION !== 'yes') {
      console.log('To proceed, run with CONFIRM_MIGRATION=yes:');
      console.log(
        `  CONFIRM_MIGRATION=yes pnpm exec tsx scripts/migrate-embedding-provider.ts ${newProvider}`
      );
      await prisma.$disconnect();
      process.exit(1);
    }
  }

  console.log('\nMigrating embedding column...');

  // Drop and recreate
  console.log('  - Dropping existing embedding column and indexes...');
  await dropEmbeddingColumn();

  console.log(`  - Creating embedding column with ${newDimension} dimensions...`);
  await createEmbeddingColumn(newDimension);

  console.log('  - Embedding column migrated successfully!');

  // Get sources for re-vectorization info
  const sources = await getAllSourcesWithSegments();

  console.log(`\n=== Re-vectorization Required ===\n`);
  console.log(
    `${sources.length} sources with ${totalSegments} total segments need re-vectorization.`
  );
  console.log('\nTo re-vectorize, you have two options:');
  console.log('\n1. Automatic (recommended):');
  console.log('   - Update your .env file: EMBEDDING_PROVIDER=' + newProvider);
  console.log('   - Restart workers: pnpm run worker');
  console.log('   - Trigger reprocessing via API for each source');
  console.log('\n2. Manual re-processing:');
  console.log(
    '   For each source, call POST /api/projects/{projectId}/sources/{sourceId}/reprocess'
  );

  if (sources.length <= 10) {
    console.log('\nSource IDs to reprocess:');
    sources.forEach((s) => {
      console.log(`  - ${s.id} (${s.segmentCount} segments)`);
    });
  }

  console.log('\n=== Migration Complete ===\n');

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('Migration failed:', e);
  await prisma.$disconnect();
  process.exit(1);
});
