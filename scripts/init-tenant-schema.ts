#!/usr/bin/env npx tsx

/**
 * Initialize the tenant_default schema for self-hosted mode.
 * Usage: npx tsx scripts/init-tenant-schema.ts [embedding_dims]
 */

import 'dotenv/config';
import { createTenantSchema, tenantSchemaExists } from '../src/lib/db/tenant';

async function main() {
  const embeddingDims = parseInt(process.argv[2] || '1536', 10);

  console.log(`Checking tenant_default schema...`);

  const exists = await tenantSchemaExists('tenant_default');
  if (exists) {
    console.log('tenant_default schema already exists, skipping...');
    process.exit(0);
  }

  console.log(`Creating tenant_default schema with ${embeddingDims}-dimension embeddings...`);
  await createTenantSchema('default', embeddingDims);
  console.log('Done!');

  process.exit(0);
}

main().catch((err) => {
  console.error('Failed to create tenant schema:', err.message);
  process.exit(1);
});
