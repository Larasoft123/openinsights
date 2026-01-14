import { Pool, PoolClient } from 'pg';
import { readFile } from 'fs/promises';
import { join } from 'path';

/**
 * Tenant Schema Management
 *
 * Provides utilities for schema-per-tenant multi-tenancy:
 * - Each organization gets its own PostgreSQL schema
 * - Embedding dimension is configurable per-tenant (1536 for OpenAI, 768 for Gemini/Ollama)
 * - GDPR-compliant deletion via DROP SCHEMA CASCADE
 */

const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://openinsights:openinsights_dev@localhost:5432/openinsights';

// Connection pool for raw SQL operations on tenant schemas
const globalForPool = globalThis as unknown as {
  tenantPool: Pool | undefined;
};

function createPool(): Pool {
  return new Pool({
    connectionString,
    max: 20, // Maximum connections in pool
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });
}

export const tenantPool = globalForPool.tenantPool ?? createPool();

if (process.env.NODE_ENV !== 'production') {
  globalForPool.tenantPool = tenantPool;
}

/**
 * Execute operation within tenant schema context.
 *
 * Sets search_path to tenant schema + public (for user references),
 * then resets to public after operation completes.
 *
 * @example
 * const projects = await withTenantSchema('tenant_default', async (client) => {
 *   const result = await client.query('SELECT * FROM projects WHERE workspace_id = $1', [workspaceId]);
 *   return result.rows;
 * });
 */
export async function withTenantSchema<T>(
  schemaName: string,
  operation: (client: PoolClient) => Promise<T>
): Promise<T> {
  // Validate schema name to prevent SQL injection
  if (!isValidSchemaName(schemaName)) {
    throw new Error(`Invalid schema name: ${schemaName}`);
  }

  const client = await tenantPool.connect();
  try {
    // Set search_path to tenant schema + public (for user FK references)
    await client.query(`SET search_path TO "${schemaName}", public`);
    return await operation(client);
  } finally {
    // Reset to public schema
    await client.query('SET search_path TO public');
    client.release();
  }
}

/**
 * Create a new tenant schema from template.
 *
 * Embeddings: Ollama only with 768 dimensions (hardcoded in template)
 *
 * @param orgId - Organization ID (used to generate schema name)
 * @param _embeddingDimension - Deprecated, always uses 768 (Ollama)
 * @returns Schema name (e.g., "tenant_abc123")
 */
export async function createTenantSchema(
  orgId: string,
  _embeddingDimension?: number // Deprecated - kept for backward compatibility
): Promise<string> {
  // Generate schema name from org ID (replace dashes with underscores for SQL compatibility)
  const schemaName = orgId === 'default' ? 'tenant_default' : `tenant_${orgId.replace(/-/g, '_')}`;

  // Read template (embedding dimension is hardcoded to 768 in the template)
  const templatePath = join(process.cwd(), 'prisma', 'tenant-schema.sql');
  const template = await readFile(templatePath, 'utf-8');

  // Replace schema name placeholder
  const sql = template.replace(/\{\{schema_name\}\}/g, schemaName);

  // Execute schema creation
  const client = await tenantPool.connect();
  try {
    await client.query(sql);
    return schemaName;
  } finally {
    client.release();
  }
}

/**
 * Drop tenant schema completely.
 *
 * Used for GDPR-compliant data deletion - removes ALL tenant data.
 * Safety check prevents dropping public schema.
 *
 * @param schemaName - Schema to drop (must start with "tenant_")
 */
export async function dropTenantSchema(schemaName: string): Promise<void> {
  // Safety checks
  if (schemaName === 'public') {
    throw new Error('Cannot drop public schema');
  }
  if (!schemaName.startsWith('tenant_')) {
    throw new Error(`Schema name must start with "tenant_": ${schemaName}`);
  }
  if (!isValidSchemaName(schemaName)) {
    throw new Error(`Invalid schema name: ${schemaName}`);
  }

  const client = await tenantPool.connect();
  try {
    // CASCADE removes all objects and data in the schema
    await client.query(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
  } finally {
    client.release();
  }
}

/**
 * Check if a tenant schema exists.
 */
export async function tenantSchemaExists(schemaName: string): Promise<boolean> {
  if (!isValidSchemaName(schemaName)) {
    return false;
  }

  const result = await tenantPool.query(
    `SELECT schema_name FROM information_schema.schemata WHERE schema_name = $1`,
    [schemaName]
  );
  return result.rows.length > 0;
}

/**
 * Migrate embedding dimension for a tenant.
 *
 * WARNING: This drops all embeddings and requires re-vectorization!
 * Used when tenant changes AI provider (e.g., OpenAI -> Gemini).
 */
export async function migrateEmbeddingDimension(
  schemaName: string,
  newDimension: number
): Promise<void> {
  if (!isValidSchemaName(schemaName)) {
    throw new Error(`Invalid schema name: ${schemaName}`);
  }
  if (![768, 1536, 3072].includes(newDimension)) {
    throw new Error(`Invalid embedding dimension: ${newDimension}`);
  }

  await withTenantSchema(schemaName, async (client) => {
    // Drop existing index
    await client.query(`
      DROP INDEX IF EXISTS "${schemaName}_segments_embedding_idx"
    `);

    // Drop and recreate column with new dimension
    await client.query(`
      ALTER TABLE transcript_segments DROP COLUMN IF EXISTS embedding
    `);
    await client.query(`
      ALTER TABLE transcript_segments ADD COLUMN embedding vector(${newDimension})
    `);

    // Recreate HNSW index
    await client.query(`
      CREATE INDEX "${schemaName}_segments_embedding_idx"
      ON transcript_segments USING hnsw (embedding vector_cosine_ops)
    `);
  });
}

/**
 * Get all tenant schemas in the database.
 */
export async function listTenantSchemas(): Promise<string[]> {
  const result = await tenantPool.query(`
    SELECT schema_name
    FROM information_schema.schemata
    WHERE schema_name LIKE 'tenant_%'
    ORDER BY schema_name
  `);
  return result.rows.map((row: { schema_name: string }) => row.schema_name);
}

/**
 * Validate schema name to prevent SQL injection.
 * Only allows alphanumeric characters and underscores.
 */
function isValidSchemaName(name: string): boolean {
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name);
}

/**
 * Execute a raw query in tenant context.
 * Convenience wrapper for simple queries.
 */
export async function queryTenant<T extends Record<string, unknown>>(
  schemaName: string,
  sql: string,
  params: unknown[] = []
): Promise<T[]> {
  return withTenantSchema(schemaName, async (client) => {
    const result = await client.query(sql, params);
    return result.rows as T[];
  });
}
