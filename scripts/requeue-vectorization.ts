import { vectorizationQueue } from '../src/lib/queues';
import { tenantPool } from '../src/lib/db/tenant';

async function requeueAll() {
  // Get all completed sources
  const sourcesResult = await tenantPool.query(`
    SELECT s.id as source_id
    FROM tenant_default.sources s
    WHERE s.status = 'COMPLETED'
  `);

  console.log(`Found ${sourcesResult.rows.length} sources to re-vectorize`);

  for (const row of sourcesResult.rows) {
    // Get segment IDs for this source
    const segmentsResult = await tenantPool.query(
      `
      SELECT id FROM tenant_default.transcript_segments WHERE source_id = $1
    `,
      [row.source_id]
    );

    const segmentIds = segmentsResult.rows.map((r: { id: string }) => r.id);

    if (segmentIds.length === 0) {
      console.log(`Skipping ${row.source_id} - no segments`);
      continue;
    }

    await vectorizationQueue.add(`vectorization-${row.source_id}`, {
      sourceId: row.source_id,
      segmentIds,
      schemaName: 'tenant_default',
      skipSummary: true, // Don't regenerate summaries
    });
    console.log(`Queued: ${row.source_id} (${segmentIds.length} segments)`);
  }

  console.log('Done!');
  process.exit(0);
}

requeueAll().catch(console.error);
