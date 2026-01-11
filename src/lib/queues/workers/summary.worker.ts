import { Worker, Job } from 'bullmq';
import { Prisma } from '@prisma/client';
import { connectionOptions } from '../connection';
import { QueueName, summaryGenerationJobSchema, SummaryGenerationJobData } from '../types';
import { getProviderWithConfig } from '../../ai';
import { prisma } from '../../db';
import { logger } from '../../logger';
import { getWorkspaceAIConfigBySourceId } from '../../services/workspace-settings.service';

const log = logger.child({ worker: 'summary' });

/**
 * Source summary structure - uses index signature for Prisma JSON compatibility
 */
interface SourceSummary {
  [key: string]: unknown;
  keyTopics: string[];
  keyQuotes: { quote: string; speaker?: string }[];
  participants: { id?: string; role?: string }[];
  duration: number;
  segmentCount: number;
}

/**
 * Generate source summary prompt
 */
function buildSourceSummaryPrompt(
  segments: { content: string; speakerId: string | null }[],
  duration: number
): string {
  const transcript = segments
    .map((s) => (s.speakerId ? `[${s.speakerId}]: ${s.content}` : s.content))
    .join('\n');

  const uniqueSpeakers = [...new Set(segments.map((s) => s.speakerId).filter(Boolean))];

  return `Analyze this transcript and generate a structured summary.

TRANSCRIPT:
${transcript}

METADATA:
- Duration: ${Math.round(duration / 60)} minutes
- Segments: ${segments.length}
- Speakers: ${uniqueSpeakers.length > 0 ? uniqueSpeakers.join(', ') : 'Unknown'}

Generate a JSON response with this exact structure (no markdown, just raw JSON):
{
  "keyTopics": ["topic1", "topic2", "topic3"],
  "keyQuotes": [
    {"quote": "exact quote from transcript", "speaker": "speaker id if known"}
  ],
  "participants": [
    {"id": "speaker id", "role": "inferred role if possible"}
  ]
}

Requirements:
- keyTopics: 3-5 main themes discussed
- keyQuotes: 2-3 notable/insightful quotes (use exact words from transcript)
- participants: list speakers with inferred roles if possible

Return ONLY valid JSON, no explanations or markdown.`;
}

/**
 * Generate project summary prompt
 */
function buildProjectSummaryPrompt(
  sources: { title: string; summary: SourceSummary | null }[]
): string {
  const summaryData = sources
    .filter((s) => s.summary)
    .map((s) => ({
      title: s.title,
      topics: s.summary?.keyTopics || [],
      quotes: s.summary?.keyQuotes || [],
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
- researchObjectives: 2-3 inferred research goals based on topics
- keyFindings: 5-7 cross-session patterns and insights
- participantOverview: summary of who was interviewed
- recommendations: 2-3 suggested next steps

Return ONLY valid JSON, no explanations or markdown.`;
}

/**
 * Parse AI response, handling common formatting issues
 */
function parseAIResponse<T>(response: string): T {
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

  return JSON.parse(cleaned);
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
  const { sourceId, projectId } = data;

  const jobLog = log.child({ jobId: job.id, sourceId, projectId });
  jobLog.info('Starting summary generation');

  try {
    if (sourceId) {
      await generateSourceSummary(sourceId, jobLog, job);
    } else if (projectId) {
      await generateProjectSummary(projectId, jobLog, job);
    }

    const duration = Date.now() - startTime;
    jobLog.info({ duration }, 'Summary generation complete');
    await job.updateProgress(100);
  } catch (error) {
    jobLog.error({ error }, 'Summary generation failed');

    // Update status to FAILED
    if (sourceId) {
      await prisma.source.update({
        where: { id: sourceId },
        data: { summaryStatus: 'FAILED' },
      });
    } else if (projectId) {
      await prisma.project.update({
        where: { id: projectId },
        data: { summaryStatus: 'FAILED' },
      });
    }

    throw error;
  }
}

/**
 * Generate summary for a single source
 */
async function generateSourceSummary(
  sourceId: string,
  jobLog: typeof log,
  job: Job<SummaryGenerationJobData>
): Promise<void> {
  // Mark as generating
  await prisma.source.update({
    where: { id: sourceId },
    data: { summaryStatus: 'GENERATING' },
  });

  await job.updateProgress(10);

  // Fetch source with segments
  const source = await prisma.source.findUnique({
    where: { id: sourceId },
    include: {
      segments: {
        select: { content: true, speakerId: true },
        orderBy: { startTime: 'asc' },
      },
      project: {
        select: { workspaceId: true },
      },
    },
  });

  if (!source) {
    throw new Error(`Source not found: ${sourceId}`);
  }

  if (source.segments.length === 0) {
    jobLog.warn('No segments found, skipping summary');
    await prisma.source.update({
      where: { id: sourceId },
      data: {
        summaryStatus: 'COMPLETED',
        summary: Prisma.DbNull,
        summaryGeneratedAt: new Date(),
      },
    });
    return;
  }

  await job.updateProgress(20);

  // Get workspace AI config
  const workspaceConfig = await getWorkspaceAIConfigBySourceId(sourceId);
  jobLog.debug({ workspaceConfig }, 'Retrieved workspace AI config');

  // Get AI provider
  const provider = getProviderWithConfig(workspaceConfig);
  if (!provider.generateText) {
    throw new Error(`Provider ${provider.name} does not support text generation`);
  }

  jobLog.info({ provider: provider.name }, 'Using AI provider for summary');

  await job.updateProgress(30);

  // Build prompt and generate summary
  const prompt = buildSourceSummaryPrompt(source.segments, source.duration || 0);

  jobLog.debug({ promptLength: prompt.length }, 'Calling AI provider');

  const response = await provider.generateText(prompt, {
    maxTokens: 1000,
    temperature: 0.3,
  });

  await job.updateProgress(70);

  // Parse response
  const parsedSummary = parseAIResponse<{
    keyTopics: string[];
    keyQuotes: { quote: string; speaker?: string }[];
    participants: { id?: string; role?: string }[];
  }>(response);

  // Build final summary with metadata
  const summary = {
    keyTopics: parsedSummary.keyTopics,
    keyQuotes: parsedSummary.keyQuotes,
    participants: parsedSummary.participants,
    duration: source.duration || 0,
    segmentCount: source.segments.length,
  };

  await job.updateProgress(90);

  // Store summary - cast to Prisma.InputJsonObject for type compatibility
  await prisma.source.update({
    where: { id: sourceId },
    data: {
      summary: summary as Prisma.InputJsonObject,
      summaryStatus: 'COMPLETED',
      summaryGeneratedAt: new Date(),
    },
  });

  jobLog.info({ keyTopicsCount: summary.keyTopics.length }, 'Source summary stored');
}

/**
 * Generate summary for a project (aggregates all source summaries)
 */
async function generateProjectSummary(
  projectId: string,
  jobLog: typeof log,
  job: Job<SummaryGenerationJobData>
): Promise<void> {
  // Mark as generating
  await prisma.project.update({
    where: { id: projectId },
    data: { summaryStatus: 'GENERATING' },
  });

  await job.updateProgress(10);

  // Fetch project with sources
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      sources: {
        where: { deletedAt: null },
        select: {
          id: true,
          title: true,
          summary: true,
        },
      },
      workspace: {
        select: {
          id: true,
          aiProvider: true,
          geminiApiKey: true,
          openaiApiKey: true,
        },
      },
    },
  });

  if (!project) {
    throw new Error(`Project not found: ${projectId}`);
  }

  if (project.sources.length === 0) {
    jobLog.warn('No sources found, skipping summary');
    await prisma.project.update({
      where: { id: projectId },
      data: {
        summaryStatus: 'COMPLETED',
        summary: Prisma.DbNull,
        summaryGeneratedAt: new Date(),
      },
    });
    return;
  }

  await job.updateProgress(20);

  // Get AI provider with workspace config
  const workspaceConfig = {
    aiProvider: project.workspace.aiProvider as 'gemini' | 'openai' | null,
    geminiApiKey: project.workspace.geminiApiKey,
    openaiApiKey: project.workspace.openaiApiKey,
  };

  const provider = getProviderWithConfig(workspaceConfig);
  if (!provider.generateText) {
    throw new Error(`Provider ${provider.name} does not support text generation`);
  }

  jobLog.info({ provider: provider.name }, 'Using AI provider for summary');

  await job.updateProgress(30);

  // Build prompt
  const sourcesWithSummary = project.sources.map((s) => ({
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
  const parsedSummary = parseAIResponse<{
    researchObjectives: string[];
    keyFindings: string[];
    participantOverview: { count: number; description?: string };
    recommendations: string[];
  }>(response);

  // Build final summary with metadata
  const summary = {
    researchObjectives: parsedSummary.researchObjectives,
    keyFindings: parsedSummary.keyFindings,
    participantOverview: parsedSummary.participantOverview,
    recommendations: parsedSummary.recommendations,
    sourcesAnalyzed: project.sources.length,
  };

  await job.updateProgress(90);

  // Store summary - cast to Prisma.InputJsonObject for type compatibility
  await prisma.project.update({
    where: { id: projectId },
    data: {
      summary: summary as Prisma.InputJsonObject,
      summaryStatus: 'COMPLETED',
      summaryGeneratedAt: new Date(),
    },
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
