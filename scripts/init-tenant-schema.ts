#!/usr/bin/env npx tsx

/**
 * Initialize the tenant_default schema for self-hosted mode.
 * Embeddings: Ollama only with 768 dimensions
 */

import 'dotenv/config';
import { createTenantSchema, tenantSchemaExists } from '../src/lib/db/tenant';

// Embedding dimension is always 768 (Ollama nomic-embed-text)
const EMBEDDING_DIMS = 768;

async function main() {
  console.log(`Checking tenant_default schema...`);

  const exists = await tenantSchemaExists('tenant_default');
  if (exists) {
    console.log('tenant_default schema already exists, skipping...');
    process.exit(0);
  }

  console.log(
    `Creating tenant_default schema with ${EMBEDDING_DIMS}-dimension embeddings (Ollama)...`
  );
  await createTenantSchema('default', EMBEDDING_DIMS);
  console.log('Done!');

  process.exit(0);
}

main().catch((err) => {
  console.error('Failed to create tenant schema:', err.message);
  process.exit(1);
});
