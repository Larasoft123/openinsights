import { Worker, Job } from 'bullmq';
import { connectionOptions } from '../connection';
import { QueueName, summaryGenerationJobSchema, SummaryGenerationJobData } from '../types';
import { getGeneralAIProvider } from '../../ai';
import {
  buildSourceSummaryPrompt,
  buildProjectSummaryPrompt,
  extractProjectContext,
} from '../../ai/prompt-builder';
import { withTenantSchema } from '../../db/tenant';
import { updateSource, updateProject, getProjectById } from '../../db/tenant-queries';
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
 * Escape control characters inside JSON string values.
 * JSON doesn't allow raw newlines/tabs inside strings - they must be escaped.
 */
function escapeControlCharsInStrings(json: string): string {
  let result = '';
  let inString = false;
  let escape = false;

  for (let i = 0; i < json.length; i++) {
    const char = json[i];
    const code = json.charCodeAt(i);

    if (escape) {
      result += char;
      escape = false;
      continue;
    }

    if (char === '\\' && inString) {
      escape = true;
      result += char;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      result += char;
      continue;
    }

    // If inside a string, escape control characters
    if (inString) {
      if (code === 10) {
        // newline -> \n
        result += '\\n';
      } else if (code === 13) {
        // carriage return -> \r
        result += '\\r';
      } else if (code === 9) {
        // tab -> \t
        result += '\\t';
      } else if (code < 32) {
        // other control chars -> \uXXXX
        result += '\\u' + code.toString(16).padStart(4, '0');
      } else {
        result += char;
      }
    } else {
      result += char;
    }
  }

  return result;
}

/**
 * Try to fix truncated JSON by closing open brackets and quotes.
 */
function fixTruncatedJson(json: string): string {
  const stack: string[] = [];
  let inString = false;
  let escape = false;

  for (let i = 0; i < json.length; i++) {
    const char = json[i];

    if (escape) {
      escape = false;
      continue;
    }

    if (char === '\\' && inString) {
      escape = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      if (inString) {
        stack.push('"');
      } else {
        // Pop string marker
        while (stack.length > 0 && stack[stack.length - 1] === '"') {
          stack.pop();
          break;
        }
      }
      continue;
    }

    if (!inString) {
      if (char === '{') {
        stack.push('}');
      } else if (char === '[') {
        stack.push(']');
      } else if (char === '}' || char === ']') {
        if (stack.length > 0 && stack[stack.length - 1] === char) {
          stack.pop();
        }
      }
    }
  }

  // Close any open structures
  let result = json;
  if (inString) {
    result += '"';
    // Pop the string marker we would have added
    if (stack.length > 0 && stack[stack.length - 1] === '"') {
      stack.pop();
    }
  }

  // Close remaining brackets in reverse order
  while (stack.length > 0) {
    const closer = stack.pop();
    if (closer !== '"') {
      result += closer;
    }
  }

  return result;
}

/**
 * Extract JSON object from text that may contain extra content.
 */
function extractJsonObject(text: string): string | null {
  // Find first { and last matching }
  let depth = 0;
  let start = -1;
  let inString = false;
  let escape = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (escape) {
      escape = false;
      continue;
    }

    if (char === '\\' && inString) {
      escape = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (!inString) {
      if (char === '{') {
        if (depth === 0) start = i;
        depth++;
      } else if (char === '}') {
        depth--;
        if (depth === 0 && start !== -1) {
          return text.substring(start, i + 1);
        }
      }
    }
  }

  // If we found a start but no end, return from start to end (truncated)
  if (start !== -1) {
    return text.substring(start);
  }

  return null;
}

/**
 * Parse AI response, handling common formatting issues:
 * - Markdown code blocks
 * - Raw newlines inside strings
 * - Truncated JSON
 * - Extra text before/after JSON
 */
function parseAIResponse<T>(response: string, jobLog: typeof log): T {
  // Step 1: Remove markdown code blocks
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

  // Step 2: Extract JSON object if there's extra text
  const extracted = extractJsonObject(cleaned);
  if (extracted) {
    cleaned = extracted;
  }

  // Step 3: Escape control characters inside strings
  cleaned = escapeControlCharsInStrings(cleaned);

  // Step 4: Try to parse
  try {
    return JSON.parse(cleaned);
  } catch (firstError) {
    // Step 5: Try to fix truncated JSON
    const fixed = fixTruncatedJson(cleaned);
    try {
      return JSON.parse(fixed);
    } catch (secondError) {
      jobLog.error(
        {
          rawResponse: response.substring(0, 500),
          cleanedResponse: cleaned.substring(0, 500),
          fixedResponse: fixed.substring(0, 500),
          firstError: firstError instanceof Error ? firstError.message : String(firstError),
          secondError: secondError instanceof Error ? secondError.message : String(secondError),
        },
        'Failed to parse AI response as JSON'
      );
      throw new Error(`Invalid JSON from AI: ${cleaned.substring(0, 200)}`);
    }
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
    // Get source with project_id
    const sourceResult = await client.query(
      `SELECT id, duration, project_id FROM sources WHERE id = $1`,
      [sourceId]
    );
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

  // Fetch project for context and custom guidelines
  const project = await getProjectById(schemaName, sourceData.projectId);
  const projectContext = extractProjectContext(project);
  const userGuidelines = project?.sourceSummaryPrompt;

  if (userGuidelines) {
    jobLog.debug('Using custom source summary guidelines from project settings');
  }
  if (projectContext.goals || projectContext.researchQuestions) {
    jobLog.debug('Including project context in prompt');
  }

  // Build transcript from segments
  const transcript = sourceData.segments
    .map((s) => (s.speakerId ? `[${s.speakerId}]: ${s.content}` : s.content))
    .join('\n');

  const uniqueSpeakers = [...new Set(sourceData.segments.map((s) => s.speakerId).filter(Boolean))];
  const speakersStr = uniqueSpeakers.length > 0 ? uniqueSpeakers.join(', ') : 'Unknown';

  // Build prompt using centralized prompt builder
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

  // Fetch project data and sources from tenant schema
  const project = await getProjectById(schemaName, projectId);
  if (!project) {
    throw new Error(`Project not found: ${projectId}`);
  }

  const projectData = await withTenantSchema(schemaName, async (client) => {
    // Get sources with summaries
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

  // Extract project context and user guidelines
  const projectContext = extractProjectContext(project);
  const userGuidelines = project.projectSummaryPrompt;

  if (userGuidelines) {
    jobLog.debug('Using custom project summary guidelines from project settings');
  }
  if (projectContext.goals || projectContext.researchQuestions) {
    jobLog.debug('Including project context in prompt');
  }

  // Build sources JSON for the prompt
  const sourcesWithSummary = projectData.sources
    .filter((s) => s.summary)
    .map((s) => ({
      title: s.title,
      narrative: (s.summary as SourceSummary)?.narrative || '',
    }));

  // Build prompt using centralized prompt builder
  const prompt = buildProjectSummaryPrompt(
    {
      sourcesJson: JSON.stringify(sourcesWithSummary, null, 2),
      sourceCount: projectData.sources.length,
    },
    projectContext,
    userGuidelines
  );

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
