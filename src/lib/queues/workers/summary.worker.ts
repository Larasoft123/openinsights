import { Worker, Job } from 'bullmq';
import { connectionOptions } from '../connection';
import { QueueName, summaryGenerationJobSchema, SummaryGenerationJobData } from '../types';
import { getGeneralAIProvider } from '../../ai';
import { withTenantSchema } from '../../db/tenant';
import { updateSource, updateProject } from '../../db/tenant-queries';
import { logger } from '../../logger';
import {
  getOrganizationAIConfig,
  getDefaultOrganizationId,
} from '../../services/organization-settings.service';

const log = logger.child({ worker: 'summary' });

/**
 * Source summary structure - uses index signature for JSON compatibility
 * Format: concise narrative split by topics
 */
interface SourceSummary {
  [key: string]: unknown;
  narrative: string;
  duration: number;
  segmentCount: number;
}

/**
 * Generate source summary prompt
 * Creates a prompt that asks for a concise narrative split by topics
 */
function buildSourceSummaryPrompt(
  segments: { content: string; speakerId: string | null }[],
  duration: number
): string {
  const transcript = segments
    .map((s) => (s.speakerId ? `[${s.speakerId}]: ${s.content}` : s.content))
    .join('\n');

  const uniqueSpeakers = [...new Set(segments.map((s) => s.speakerId).filter(Boolean))];

  return `Analyze this transcript and generate a concise narrative summary organized by topics.

TRANSCRIPT:
${transcript}

METADATA:
- Duration: ${Math.round(duration / 60)} minutes
- Segments: ${segments.length}
- Speakers: ${uniqueSpeakers.length > 0 ? uniqueSpeakers.join(', ') : 'Unknown'}

Generate a JSON response with this exact structure (no markdown, just raw JSON):
{
  "narrative": "Your narrative summary here"
}

Requirements for the narrative:
- Write a concise summary (150-300 words) organized by key topics
- Use topic headers in bold format like **Topic Name** followed by a brief paragraph
- Cover 3-5 main topics discussed in the transcript
- Be factual and objective, summarizing what was actually said
- Include speaker names when relevant to the discussion
- Write in third person (e.g., "The participants discussed..." or "Speaker A explained...")

Example format:
"**User Onboarding Experience**
Participants discussed challenges with the current onboarding flow, noting that new users often struggle with the initial setup process.

**Feature Requests**
Several suggestions emerged around improving the dashboard, including real-time notifications and better data visualization options."

Return ONLY valid JSON, no explanations or markdown.`;
}

/**
 * Generate project summary prompt
 * Uses narrative summaries from sources to create a project-level synthesis
 */
function buildProjectSummaryPrompt(
  sources: { title: string; summary: SourceSummary | null }[]
): string {
  const summaryData = sources
    .filter((s) => s.summary)
    .map((s) => ({
      title: s.title,
      narrative: s.summary?.narrative || '',
    }));

  return `Analyze these source summaries from a research project and generate a project-level synthesis.

SOURCES:
${JSON.stringify(summaryData, null, 2)}

Generate a JSON response with this exact structure (no markdown, just raw JSON):
{
  "researchObjectives": ["objective1", "objective2"],
  "keyFindings": ["finding1", "finding2", "finding3", "finding4", "finding5"],
  "participantOverview": {"count": ${sources.length}, "description": "brief description"},
  "recommendations": ["recommendation1", "recommendation2"]
}

Requirements:
- researchObjectives: 2-3 inferred research goals based on topics across all sources
- keyFindings: 5-7 cross-session patterns and insights
- participantOverview: summary of who was interviewed
- recommendations: 2-3 suggested next steps

Return ONLY valid JSON, no explanations or markdown.`;
}

/**
 * Parse AI response, handling common formatting issues
 */
function parseAIResponse<T>(response: string, jobLog: typeof log): T {
  // Remove markdown code blocks if present
  let cleaned = response.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3);
  }
  cleaned = cleaned.trim();

  try {
    return JSON.parse(cleaned);
  } catch (error) {
    jobLog.error(
      { rawResponse: response, cleanedResponse: cleaned },
      'Failed to parse AI response as JSON'
    );
    throw new Error(`Invalid JSON from AI: ${cleaned.substring(0, 200)}`);
  }
}

/**
 * Summary Generation Worker
 *
 * Generates AI summaries for sources and projects using the workspace's
 * configured AI provider.
 *
 * Flow for Source Summary:
 * 1. Fetch transcript segments from database
 * 2. Build prompt with transcript content
 * 3. Call AI provider's generateText method
 * 4. Parse and validate response
 * 5. Store summary in database
 *
 * Flow for Project Summary:
 * 1. Fetch all sources with their summaries
 * 2. Aggregate and build prompt
 * 3. Generate and store project summary
 */
async function processJob(job: Job<SummaryGenerationJobData>): Promise<void> {
  const startTime = Date.now();

  // Validate job data with Zod
  const data = summaryGenerationJobSchema.parse(job.data);
  const { sourceId, projectId, schemaName } = data;

  const jobLog = log.child({ jobId: job.id, sourceId, projectId, schemaName });
  jobLog.info('Starting summary generation');

  try {
    if (sourceId) {
      await generateSourceSummary(sourceId, schemaName, jobLog, job);
    } else if (projectId) {
      await generateProjectSummary(projectId, schemaName, jobLog, job);
    }

    const duration = Date.now() - startTime;
    jobLog.info({ duration }, 'Summary generation complete');
    await job.updateProgress(100);
  } catch (error) {
    jobLog.error({ error }, 'Summary generation failed');

    // Update status to FAILED
    if (sourceId) {
      await updateSource(schemaName, sourceId, { summaryStatus: 'FAILED' });
    } else if (projectId) {
      await updateProject(schemaName, projectId, { summaryStatus: 'FAILED' });
    }

    throw error;
  }
}

/**
 * Generate summary for a single source
 */
async function generateSourceSummary(
  sourceId: string,
  schemaName: string,
  jobLog: typeof log,
  job: Job<SummaryGenerationJobData>
): Promise<void> {
  // Mark as generating
  await updateSource(schemaName, sourceId, { summaryStatus: 'GENERATING' });

  await job.updateProgress(10);

  // Fetch source with segments from tenant schema
  const sourceData = await withTenantSchema(schemaName, async (client) => {
    // Get source
    const sourceResult = await client.query(`SELECT id, duration FROM sources WHERE id = $1`, [
      sourceId,
    ]);
    if (sourceResult.rows.length === 0) return null;

    // Get segments
    const segmentsResult = await client.query(
      `SELECT content, speaker_id FROM transcript_segments
       WHERE source_id = $1 ORDER BY start_time ASC`,
      [sourceId]
    );

    return {
      id: sourceResult.rows[0].id,
      duration: sourceResult.rows[0].duration,
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
    jobLog.warn('No segments found, skipping summary');
    await updateSource(schemaName, sourceId, {
      summaryStatus: 'COMPLETED',
      summary: null,
      summaryGeneratedAt: new Date(),
    });
    return;
  }

  await job.updateProgress(20);

  // Get organization AI config
  const organizationId = await getDefaultOrganizationId();
  const orgConfig = await getOrganizationAIConfig(organizationId);
  jobLog.debug(
    {
      provider: orgConfig?.generalAiProvider || 'gemini',
      hasApiKey: !!(orgConfig?.generalAiProvider === 'openai'
        ? orgConfig?.openaiApiKey
        : orgConfig?.geminiApiKey),
    },
    'Retrieved organization AI config'
  );

  // Get AI provider
  const provider = getGeneralAIProvider(orgConfig || {});
  if (!provider.generateText) {
    throw new Error(`Provider ${provider.name} does not support text generation`);
  }

  jobLog.info({ provider: provider.name }, 'Using AI provider for summary');

  await job.updateProgress(30);

  // Build prompt and generate summary
  const prompt = buildSourceSummaryPrompt(sourceData.segments, sourceData.duration || 0);

  jobLog.debug({ promptLength: prompt.length }, 'Calling AI provider');

  const response = await provider.generateText(prompt, {
    maxTokens: 1000,
    temperature: 0.3,
  });

  await job.updateProgress(70);

  // Parse response
  jobLog.debug({ responseLength: response.length }, 'AI response received');
  const parsedSummary = parseAIResponse<{
    narrative: string;
  }>(response, jobLog);

  // Build final summary with metadata
  const summary: SourceSummary = {
    narrative: parsedSummary.narrative,
    duration: sourceData.duration || 0,
    segmentCount: sourceData.segments.length,
  };

  await job.updateProgress(90);

  // Store summary
  await updateSource(schemaName, sourceId, {
    summary,
    summaryStatus: 'COMPLETED',
    summaryGeneratedAt: new Date(),
  });

  jobLog.info({ narrativeLength: summary.narrative.length }, 'Source summary stored');
}

/**
 * Generate summary for a project (aggregates all source summaries)
 */
async function generateProjectSummary(
  projectId: string,
  schemaName: string,
  jobLog: typeof log,
  job: Job<SummaryGenerationJobData>
): Promise<void> {
  // Mark as generating
  await updateProject(schemaName, projectId, { summaryStatus: 'GENERATING' });

  await job.updateProgress(10);

  // Fetch project with sources from tenant schema
  const projectData = await withTenantSchema(schemaName, async (client) => {
    // Get project
    const projectResult = await client.query(`SELECT id FROM projects WHERE id = $1`, [projectId]);
    if (projectResult.rows.length === 0) return null;

    // Get sources with summaries
    const sourcesResult = await client.query(
      `SELECT id, title, summary FROM sources
       WHERE project_id = $1 AND deleted_at IS NULL`,
      [projectId]
    );

    return {
      id: projectResult.rows[0].id,
      sources: sourcesResult.rows.map((r) => ({
        id: r.id,
        title: r.title,
        summary: r.summary,
      })),
    };
  });

  if (!projectData) {
    throw new Error(`Project not found: ${projectId}`);
  }

  if (projectData.sources.length === 0) {
    jobLog.warn('No sources found, skipping summary');
    await updateProject(schemaName, projectId, {
      summaryStatus: 'COMPLETED',
      summary: null,
      summaryGeneratedAt: new Date(),
    });
    return;
  }

  await job.updateProgress(20);

  // Get organization AI config
  const organizationId = await getDefaultOrganizationId();
  const orgConfig = await getOrganizationAIConfig(organizationId);
  jobLog.debug(
    {
      provider: orgConfig?.generalAiProvider || 'gemini',
      hasApiKey: !!(orgConfig?.generalAiProvider === 'openai'
        ? orgConfig?.openaiApiKey
        : orgConfig?.geminiApiKey),
    },
    'Retrieved organization AI config'
  );

  // Get AI provider
  const provider = getGeneralAIProvider(orgConfig || {});
  if (!provider.generateText) {
    throw new Error(`Provider ${provider.name} does not support text generation`);
  }

  jobLog.info({ provider: provider.name }, 'Using AI provider for summary');

  await job.updateProgress(30);

  // Build prompt
  const sourcesWithSummary = projectData.sources.map((s) => ({
    title: s.title,
    summary: s.summary as SourceSummary | null,
  }));

  const prompt = buildProjectSummaryPrompt(sourcesWithSummary);

  jobLog.debug({ promptLength: prompt.length }, 'Calling AI provider');

  const response = await provider.generateText(prompt, {
    maxTokens: 1500,
    temperature: 0.3,
  });

  await job.updateProgress(70);

  // Parse response
  jobLog.debug({ responseLength: response.length }, 'AI response received');
  const parsedSummary = parseAIResponse<{
    researchObjectives: string[];
    keyFindings: string[];
    participantOverview: { count: number; description?: string };
    recommendations: string[];
  }>(response, jobLog);

  // Build final summary with metadata
  const summary = {
    researchObjectives: parsedSummary.researchObjectives,
    keyFindings: parsedSummary.keyFindings,
    participantOverview: parsedSummary.participantOverview,
    recommendations: parsedSummary.recommendations,
    sourcesAnalyzed: projectData.sources.length,
  };

  await job.updateProgress(90);

  // Store summary
  await updateProject(schemaName, projectId, {
    summary,
    summaryStatus: 'COMPLETED',
    summaryGeneratedAt: new Date(),
  });

  jobLog.info(
    { keyFindingsCount: summary.keyFindings.length, sourcesAnalyzed: summary.sourcesAnalyzed },
    'Project summary stored'
  );
}

// Create the worker
const concurrency = parseInt(process.env.WORKER_CONCURRENCY || '2', 10);

export const summaryWorker = new Worker<SummaryGenerationJobData>(
  QueueName.SUMMARY_GENERATION,
  processJob,
  {
    connection: connectionOptions,
    concurrency,
  }
);

// Event handlers
summaryWorker.on('completed', (job) => {
  log.info(
    { jobId: job.id, sourceId: job.data.sourceId, projectId: job.data.projectId },
    'Job completed'
  );
});

summaryWorker.on('failed', (job, error) => {
  log.error(
    { jobId: job?.id, sourceId: job?.data.sourceId, projectId: job?.data.projectId, error },
    'Job failed'
  );
});

summaryWorker.on('error', (error) => {
  log.error({ error }, 'Worker error');
});

// Graceful shutdown
export async function shutdownSummaryWorker(): Promise<void> {
  log.info('Shutting down summary worker');
  await summaryWorker.close();
  log.info('Summary worker shut down');
}
