/**
 * Generate thumbnails for existing sources
 *
 * Run with: pnpm tsx scripts/generate-thumbnails.ts
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { Pool } from 'pg';
import { downloadFile, uploadFile, getThumbnailKey } from '../src/lib/services/storage.service';
import {
  extractVideoThumbnail,
  generateAudioWaveform,
} from '../src/lib/services/thumbnail.service';

const DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://openinsights:openinsights_dev@localhost:5433/openinsights';

const TENANT_SCHEMA = process.env.TENANT_SCHEMA || 'tenant_default';

interface Source {
  id: string;
  title: string;
  file_url: string;
  file_type: string;
  thumbnail_url: string | null;
}

async function main() {
  console.log('=== Thumbnail Generation Script ===\n');

  const pool = new Pool({ connectionString: DATABASE_URL });

  try {
    // Get all sources without thumbnails
    const result = await pool.query<Source>(
      `SELECT id, title, file_url, file_type, thumbnail_url
       FROM ${TENANT_SCHEMA}.sources
       WHERE deleted_at IS NULL AND thumbnail_url IS NULL
       ORDER BY created_at DESC`
    );

    const sources = result.rows;
    console.log(`Found ${sources.length} sources without thumbnails\n`);

    if (sources.length === 0) {
      console.log('No sources need thumbnails. Exiting.');
      return;
    }

    let successCount = 0;
    let failCount = 0;

    for (const source of sources) {
      console.log(`Processing: ${source.title} (${source.id})`);
      console.log(`  Type: ${source.file_type}`);

      const isVideo = source.file_type.startsWith('video/');
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'thumbnail-'));

      try {
        // Download the source file
        console.log('  Downloading file...');
        const fileBuffer = await downloadFile(source.file_url);
        const inputPath = path.join(tempDir, isVideo ? 'input.video' : 'input.audio');
        await fs.writeFile(inputPath, fileBuffer);
        console.log(`  Downloaded ${(fileBuffer.length / 1024 / 1024).toFixed(2)} MB`);

        // Generate thumbnail
        const thumbnailPath = path.join(tempDir, 'thumbnail.jpg');

        if (isVideo) {
          console.log('  Extracting video frame...');
          await extractVideoThumbnail(inputPath, thumbnailPath);
        } else {
          console.log('  Generating audio waveform...');
          await generateAudioWaveform(inputPath, thumbnailPath);
        }

        // Upload thumbnail
        console.log('  Uploading thumbnail...');
        const thumbnailBuffer = await fs.readFile(thumbnailPath);
        const thumbnailKey = getThumbnailKey(source.id);
        await uploadFile(thumbnailKey, thumbnailBuffer, { contentType: 'image/jpeg' });

        // Update database
        await pool.query(`UPDATE ${TENANT_SCHEMA}.sources SET thumbnail_url = $1 WHERE id = $2`, [
          thumbnailKey,
          source.id,
        ]);

        console.log(`  SUCCESS: ${thumbnailKey}\n`);
        successCount++;
      } catch (error) {
        console.error(`  FAILED: ${error instanceof Error ? error.message : error}\n`);
        failCount++;
      } finally {
        // Cleanup
        try {
          await fs.rm(tempDir, { recursive: true, force: true });
        } catch {
          // Ignore cleanup errors
        }
      }
    }

    console.log('=== Summary ===');
    console.log(`Success: ${successCount}`);
    console.log(`Failed: ${failCount}`);
    console.log(`Total: ${sources.length}`);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
