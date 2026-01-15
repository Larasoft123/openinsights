/**
 * Test Helper for Summary Generation Worker
 *
 * This helper exposes the worker's processJob function for integration testing.
 */

import { Job } from 'bullmq';
import { summaryGenerationJobSchema, SummaryGenerationJobData } from '@/lib/queues/types';
import { getGeneralAIProvider } from '@/lib/ai';
import {
  buildSourceSummaryPrompt,
  buildProjectSummaryPrompt,
  extractProjectContext,
} from '@/lib/ai/prompt-builder';
import { withTenantSchema } from '@/lib/db/tenant';
import { updateSource, updateProject, getProjectById } from '@/lib/db/tenant-queries';
import {
  getOrganizationAIConfig,
  getDefaultOrganizationId,
} from '@/lib/services/organization-settings.service';
import { parseAIResponseForTest } from '@/lib/queues/workers/summary.worker';

interface SourceSummary {
  narrative: string;
  duration: number;
  segmentCount: number;
  [key: string]: unknown; // Index signature for compatibility with Record<string, unknown>
}

/**
 * Process a summary generation job - exported for testing
 * This mirrors the logic in summary.worker.ts processJob function
 */
export async function processSummaryJob(job: Job<SummaryGenerationJobData>): Promise<void> {
  const data = summaryGenerationJobSchema.parse(job.data);
  const { sourceId, projectId, schemaName } = data;

  try {
    if (sourceId) {
      await generateSourceSummary(sourceId, schemaName, job);
    } else if (projectId) {
      await generateProjectSummary(projectId, schemaName, job);
    }

    await job.updateProgress(100);
  } catch (error) {
    if (sourceId) {
      await updateSource(schemaName, sourceId, { summaryStatus: 'FAILED' });
    } else if (projectId) {
      await updateProject(schemaName, projectId, { summaryStatus: 'FAILED' });
    }
    throw error;
  }
}

async function generateSourceSummary(
  sourceId: string,
  schemaName: string,
  job: Job<SummaryGenerationJobData>
): Promise<void> {
  await updateSource(schemaName, sourceId, { summaryStatus: 'GENERATING' });
  await job.updateProgress(10);

  const sourceData = await withTenantSchema(schemaName, async (client) => {
    const sourceResult = await client.query(
      `SELECT id, duration, project_id FROM sources WHERE id = $1`,
      [sourceId]
    );
    if (sourceResult.rows.length === 0) return null;

    const segmentsResult = await client.query(
      `SELECT content, speaker_id FROM transcript_segments
       WHERE source_id = $1 ORDER BY start_time ASC`,
      [sourceId]
    );

    return {
      id: sourceResult.rows[0].id,
      duration: sourceResult.rows[0].duration,
      projectId: sourceResult.rows[0].project_id,
      segments: segmentsResult.rows.map((r) => ({
        content: r.content,
        speakerId: r.speaker_id,
      })),
    };
  });

  if (!sourceData) {
    throw new Error(`Source not found: ${sourceId}`);
  }

  if (sourceData.segments.length === 0) {
    await updateSource(schemaName, sourceId, {
      summaryStatus: 'COMPLETED',
      summary: null,
      summaryGeneratedAt: new Date(),
    });
    return;
  }

  await job.updateProgress(20);

  const organizationId = await getDefaultOrganizationId();
  const orgConfig = await getOrganizationAIConfig(organizationId);

  const provider = getGeneralAIProvider(orgConfig || {});
  if (!provider.generateText) {
    throw new Error(`Provider ${provider.name} does not support text generation`);
  }

  await job.updateProgress(30);

  const project = await getProjectById(schemaName, sourceData.projectId);
  const projectContext = extractProjectContext(project);
  const userGuidelines = project?.sourceSummaryPrompt;

  const transcript = sourceData.segments
    .map((s) => (s.speakerId ? `[${s.speakerId}]: ${s.content}` : s.content))
    .join('\n');

  const uniqueSpeakers = [...new Set(sourceData.segments.map((s) => s.speakerId).filter(Boolean))];
  const speakersStr = uniqueSpeakers.length > 0 ? uniqueSpeakers.join(', ') : 'Unknown';

  const prompt = buildSourceSummaryPrompt(
    {
      transcript,
      durationMinutes: Math.round((sourceData.duration || 0) / 60),
      segmentCount: sourceData.segments.length,
      speakers: speakersStr,
    },
    projectContext,
    userGuidelines
  );

  const response = await provider.generateText(prompt, {
    maxTokens: 1000,
    temperature: 0.3,
  });

  await job.updateProgress(70);

  const parsedSummary = parseAIResponseForTest<{ narrative: string }>(response);

  const summary: SourceSummary = {
    narrative: parsedSummary.narrative,
    duration: sourceData.duration || 0,
    segmentCount: sourceData.segments.length,
  };

  await job.updateProgress(90);

  await updateSource(schemaName, sourceId, {
    summary,
    summaryStatus: 'COMPLETED',
    summaryGeneratedAt: new Date(),
  });
}

async function generateProjectSummary(
  projectId: string,
  schemaName: string,
  job: Job<SummaryGenerationJobData>
): Promise<void> {
  await updateProject(schemaName, projectId, { summaryStatus: 'GENERATING' });
  await job.updateProgress(10);

  const project = await getProjectById(schemaName, projectId);
  if (!project) {
    throw new Error(`Project not found: ${projectId}`);
  }

  const projectData = await withTenantSchema(schemaName, async (client) => {
    const sourcesResult = await client.query(
      `SELECT id, title, summary FROM sources
       WHERE project_id = $1 AND deleted_at IS NULL`,
      [projectId]
    );

    return {
      sources: sourcesResult.rows.map((r) => ({
        id: r.id,
        title: r.title,
        summary: r.summary,
      })),
    };
  });

  if (projectData.sources.length === 0) {
    await updateProject(schemaName, projectId, {
      summaryStatus: 'COMPLETED',
      summary: null,
      summaryGeneratedAt: new Date(),
    });
    return;
  }

  await job.updateProgress(20);

  const organizationId = await getDefaultOrganizationId();
  const orgConfig = await getOrganizationAIConfig(organizationId);

  const provider = getGeneralAIProvider(orgConfig || {});
  if (!provider.generateText) {
    throw new Error(`Provider ${provider.name} does not support text generation`);
  }

  await job.updateProgress(30);

  const projectContext = extractProjectContext(project);
  const userGuidelines = project.projectSummaryPrompt;

  const sourcesWithSummary = projectData.sources
    .filter((s) => s.summary)
    .map((s) => ({
      title: s.title,
      narrative: (s.summary as SourceSummary)?.narrative || '',
    }));

  const prompt = buildProjectSummaryPrompt(
    {
      sourcesJson: JSON.stringify(sourcesWithSummary, null, 2),
      sourceCount: projectData.sources.length,
    },
    projectContext,
    userGuidelines
  );

  const response = await provider.generateText(prompt, {
    maxTokens: 1500,
    temperature: 0.3,
  });

  await job.updateProgress(70);

  const parsedSummary = parseAIResponseForTest<{
    researchObjectives: string;
    keyFindings: string[];
    participantOverview: string;
    recommendations: string[];
  }>(response);

  const summary = {
    researchObjectives: parsedSummary.researchObjectives,
    keyFindings: parsedSummary.keyFindings,
    participantOverview: parsedSummary.participantOverview,
    recommendations: parsedSummary.recommendations,
    sourcesAnalyzed: projectData.sources.length,
  };

  await job.updateProgress(90);

  await updateProject(schemaName, projectId, {
    summary,
    summaryStatus: 'COMPLETED',
    summaryGeneratedAt: new Date(),
  });
}
