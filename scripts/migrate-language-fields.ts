#!/usr/bin/env npx tsx

/**
 * Language Fields Migration Script
 *
 * This script adds language-related columns to existing tenant schemas:
 *
 * Projects table:
 *   - language: VARCHAR(10) NOT NULL DEFAULT 'en'
 *
 * Sources table:
 *   - language: VARCHAR(10) NOT NULL DEFAULT 'auto'
 *   - detected_language: VARCHAR(10) (nullable)
 *
 * Usage:
 *   npx tsx scripts/migrate-language-fields.ts
 *   npx tsx scripts/migrate-language-fields.ts --dry-run
 */

import 'dotenv/config';
import { listTenantSchemas, withTenantSchema } from '../src/lib/db/tenant';

interface ColumnCheckResult {
  exists: boolean;
}

async function checkColumnExists(
  schemaName: string,
  tableName: string,
  columnName: string
): Promise<boolean> {
  const result = await withTenantSchema(schemaName, async (client) => {
    const query = `
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = $1
          AND table_name = $2
          AND column_name = $3
      ) as exists
    `;
    const res = await client.query<ColumnCheckResult>(query, [schemaName, tableName, columnName]);
    return res.rows[0]?.exists ?? false;
  });
  return result;
}

async function addProjectLanguageColumn(schemaName: string, dryRun: boolean): Promise<boolean> {
  const exists = await checkColumnExists(schemaName, 'projects', 'language');

  if (exists) {
    console.log(`  [SKIP] ${schemaName}.projects.language already exists`);
    return false;
  }

  if (dryRun) {
    console.log(`  [DRY-RUN] Would add ${schemaName}.projects.language`);
    return true;
  }

  await withTenantSchema(schemaName, async (client) => {
    await client.query(`
      ALTER TABLE projects
      ADD COLUMN language VARCHAR(10) NOT NULL DEFAULT 'en'
    `);
  });

  console.log(`  [OK] Added ${schemaName}.projects.language`);
  return true;
}

async function addSourceLanguageColumns(schemaName: string, dryRun: boolean): Promise<boolean> {
  const languageExists = await checkColumnExists(schemaName, 'sources', 'language');
  const detectedExists = await checkColumnExists(schemaName, 'sources', 'detected_language');

  let changed = false;

  if (languageExists) {
    console.log(`  [SKIP] ${schemaName}.sources.language already exists`);
  } else {
    if (dryRun) {
      console.log(`  [DRY-RUN] Would add ${schemaName}.sources.language`);
      changed = true;
    } else {
      await withTenantSchema(schemaName, async (client) => {
        await client.query(`
          ALTER TABLE sources
          ADD COLUMN language VARCHAR(10) NOT NULL DEFAULT 'auto'
        `);
      });
      console.log(`  [OK] Added ${schemaName}.sources.language`);
      changed = true;
    }
  }

  if (detectedExists) {
    console.log(`  [SKIP] ${schemaName}.sources.detected_language already exists`);
  } else {
    if (dryRun) {
      console.log(`  [DRY-RUN] Would add ${schemaName}.sources.detected_language`);
      changed = true;
    } else {
      await withTenantSchema(schemaName, async (client) => {
        await client.query(`
          ALTER TABLE sources
          ADD COLUMN detected_language VARCHAR(10)
        `);
      });
      console.log(`  [OK] Added ${schemaName}.sources.detected_language`);
      changed = true;
    }
  }

  return changed;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  console.log('\n=== Language Fields Migration ===\n');

  if (dryRun) {
    console.log('[MODE] Dry run - no changes will be made\n');
  }

  // Get all tenant schemas
  const schemas = await listTenantSchemas();

  if (schemas.length === 0) {
    console.log('No tenant schemas found. Nothing to migrate.');
    process.exit(0);
  }

  console.log(`Found ${schemas.length} tenant schema(s): ${schemas.join(', ')}\n`);

  let totalChanges = 0;

  for (const schema of schemas) {
    console.log(`\nProcessing ${schema}...`);

    try {
      const projectChanged = await addProjectLanguageColumn(schema, dryRun);
      const sourceChanged = await addSourceLanguageColumns(schema, dryRun);

      if (projectChanged || sourceChanged) {
        totalChanges++;
      }
    } catch (error) {
      console.error(`  [ERROR] Failed to migrate ${schema}:`, error);
    }
  }

  console.log('\n=== Migration Summary ===\n');
  console.log(`Total schemas processed: ${schemas.length}`);
  console.log(`Schemas modified: ${totalChanges}`);

  if (dryRun && totalChanges > 0) {
    console.log('\nTo apply changes, run without --dry-run:');
    console.log('  npx tsx scripts/migrate-language-fields.ts');
  }

  console.log('\n=== Migration Complete ===\n');
  process.exit(0);
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
