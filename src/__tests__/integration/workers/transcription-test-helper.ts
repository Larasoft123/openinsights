/**
 * Test Helper for Transcription Worker
 *
 * This helper exposes the worker's processJob function for integration testing.
 * It uses the same logic as the actual worker but allows direct function calls
 * instead of going through BullMQ.
 */

import { Job } from 'bullmq';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { transcriptionJobSchema, TranscriptionJobData } from '@/lib/queues/types';
import { vectorizationQueue } from '@/lib/queues/index';
import { getTranscriptionProvider } from '@/lib/ai';
import {
  updateSource,
  createSegmentsBatch,
  getSourceById,
  getSourceWithProject,
} from '@/lib/db/tenant-queries';
import {
  getOrganizationAIConfig,
  getDefaultOrganizationId,
} from '@/lib/services/organization-settings.service';
import { getEffectiveLanguage } from '@/lib/services/language-detection.service';
import { downloadFile, uploadFile, getThumbnailKey } from '@/lib/services/storage.service';
import { generateAudioWaveform } from '@/lib/services/thumbnail.service';

/**
 * Process a transcription job - exported for testing
 * This mirrors the logic in transcription.worker.ts processJob function
 */
export async function processTranscriptionJob(job: Job<TranscriptionJobData>): Promise<void> {
  // Validate job data with Zod
  const data = transcriptionJobSchema.parse(job.data);
  const { sourceId, fileUrl, fileType, schemaName } = data;

  try {
    // Update source status to PROCESSING with progress tracking
    await updateSource(schemaName, sourceId, {
      status: 'PROCESSING',
      processingStep: 'transcribing',
      processingProgress: 0,
      processingStartedAt: new Date(),
    });

    await job.updateProgress(5);

    // Check if source already has a thumbnail (video files get thumbnail in audio-extraction)
    // If not, this is an audio-only file - generate waveform visualization
    const source = await getSourceById(schemaName, sourceId);
    if (source && !source.thumbnailUrl) {
      // Create temp directory for waveform generation
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openinsights-waveform-'));
      const audioPath = path.join(tempDir, 'audio.mp3');
      const waveformPath = path.join(tempDir, 'waveform.jpg');

      try {
        // Download audio file - extract S3 key from source.fileUrl
        const audioBuffer = await downloadFile(source.fileUrl);
        await fs.writeFile(audioPath, audioBuffer);

        // Generate waveform image
        await generateAudioWaveform(audioPath, waveformPath);

        // Upload waveform to S3
        const waveformBuffer = await fs.readFile(waveformPath);
        const thumbnailKey = getThumbnailKey(sourceId);
        await uploadFile(thumbnailKey, waveformBuffer, { contentType: 'image/jpeg' });

        // Store S3 key (not presigned URL) - URLs are generated on-demand in API layer
        await updateSource(schemaName, sourceId, { thumbnailUrl: thumbnailKey });
      } catch {
        // Waveform generation failure is non-fatal - continue
      } finally {
        // Cleanup temp files
        try {
          await fs.rm(tempDir, { recursive: true, force: true });
        } catch {
          // Ignore cleanup errors
        }
      }
    }

    await job.updateProgress(10);

    // Get organization AI configuration (for self-hosted, always default org)
    const organizationId = await getDefaultOrganizationId();
    const orgConfig = await getOrganizationAIConfig(organizationId);

    // Get source with project to determine language
    const sourceWithProject = await getSourceWithProject(schemaName, sourceId);
    if (!sourceWithProject) {
      throw new Error(`Source ${sourceId} not found`);
    }

    // Determine effective language for transcription
    const { language: effectiveLanguage, detected } = await getEffectiveLanguage(
      sourceWithProject.language,
      sourceWithProject.project.language,
      fileUrl,
      orgConfig || {}
    );

    // Save detected language to source if it was auto-detected
    if (detected) {
      await updateSource(schemaName, sourceId, { detectedLanguage: effectiveLanguage });
    }

    // Get transcription provider based on organization config
    const provider = getTranscriptionProvider(orgConfig || {});

    // Transcribe media with the determined language
    await job.updateProgress(20);

    const result = await provider.transcribe({
      sourceId,
      fileUrl,
      fileType,
      language: effectiveLanguage,
    });

    await job.updateProgress(60);

    // Update source duration if available
    if (result.duration > 0) {
      await updateSource(schemaName, sourceId, {
        duration: Math.round(result.duration),
      });
    }

    // Insert transcript segments into database using batch insert
    const segmentsToCreate = result.segments.map((segment) => ({
      sourceId,
      content: segment.content,
      startTime: segment.startTime,
      endTime: segment.endTime,
      speakerId: segment.speakerId ?? null,
    }));

    const createdSegments = await createSegmentsBatch(schemaName, segmentsToCreate);
    const segmentIds = createdSegments.map((s) => s.id);

    await job.updateProgress(80);

    // Queue vectorization job
    if (segmentIds.length > 0) {
      // Update progress step to vectorizing
      await updateSource(schemaName, sourceId, {
        processingStep: 'vectorizing',
        processingProgress: 0,
      });

      await vectorizationQueue.add(
        'vectorization',
        {
          sourceId,
          segmentIds,
          schemaName,
        },
        { jobId: `vectorization-${sourceId}` }
      );
    } else {
      // No segments, mark as completed directly
      await updateSource(schemaName, sourceId, {
        status: 'COMPLETED',
        processingStep: null,
        processingProgress: 0,
        processingStartedAt: null,
      });
    }

    await job.updateProgress(100);
  } catch (error) {
    // Update source status to FAILED
    await updateSource(schemaName, sourceId, { status: 'FAILED' });
    throw error;
  }
}
