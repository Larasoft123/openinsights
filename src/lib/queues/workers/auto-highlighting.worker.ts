import { Worker, Job } from 'bullmq';
import { connectionOptions } from '../connection';
import { QueueName, autoHighlightingJobSchema, AutoHighlightingJobData } from '../types';
import { getGeneralAIProvider } from '../../ai';
import { buildBatchAutoTaggingPrompt, extractProjectContext } from '../../ai/prompt-builder';
import { withTenantSchema } from '../../db/tenant';
import { getProjectById } from '../../db/tenant-queries';
import {
  createAISuggestionsBatch,
  type AISuggestionInput,
} from '../../db/tenant-queries/ai-suggestions';
import { logger } from '../../logger';
import {
  getOrganizationAIConfig,
  getDefaultOrganizationId,
} from '../../services/organization-settings.service';

const log = logger.child({ worker: 'auto-highlighting' });

/**
 * AI response structure for batch auto-highlighting
 */
interface AIHighlightSuggestion {
  segmentId: string;
  tagNames: string[];
  selectedText?: string;
  confidence?: number;
  note?: string;
}

interface AIResponse {
  highlights: AIHighlightSuggestion[];
}

/**
 * Minimum confidence threshold for suggestions
 */
const CONFIDENCE_THRESHOLD = 0.75;

/**
 * Parse AI response with robust error handling
 * Reuses the same error recovery pattern as summary.worker.ts
 */
function parseAIResponse<T>(response: string, jobLog: typeof log): T {
  let cleaned = response.trim();

  // Step 1: Strip markdown code blocks
  const markdownMatch = cleaned.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```$/);
  if (markdownMatch) {
    cleaned = markdownMatch[1].trim();
  }

  // Step 2: Extract first JSON object if there's extra text
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    cleaned = jsonMatch[0];
  }

  // Step 3: Escape control characters in string values
  cleaned = escapeControlCharsInStrings(cleaned);

  // Step 4: Try parsing
  try {
    return JSON.parse(cleaned) as T;
  } catch (firstError) {
    jobLog.warn({ error: firstError }, 'First JSON parse failed, trying truncation fix');

    // Step 5: Try to fix truncated JSON
    const fixed = fixTruncatedJson(cleaned);
    try {
      return JSON.parse(fixed) as T;
    } catch (secondError) {
      jobLog.error(
        { error: secondError, originalResponse: response, cleaned, fixed },
        'Failed to parse AI response after all recovery attempts'
      );
      throw new Error(`Failed to parse AI response: ${secondError}`);
    }
  }
}

/**
 * Escape control characters inside JSON string values.
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

    if (inString) {
      if (code === 10) result += '\\n';
      else if (code === 13) result += '\\r';
      else if (code === 9) result += '\\t';
      else if (code < 32) result += '\\u' + code.toString(16).padStart(4, '0');
      else result += char;
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
      continue;
    }

    if (!inString) {
      if (char === '{' || char === '[') {
        stack.push(char);
      } else if (char === '}' || char === ']') {
        stack.pop();
      }
    }
  }

  // Close any unclosed strings
  let fixed = json;
  if (inString) {
    fixed += '"';
  }

  // Close any unclosed brackets
  while (stack.length > 0) {
    const open = stack.pop();
    fixed += open === '{' ? '}' : ']';
  }

  return fixed;
}

/**
 * Main worker job processor
 */
async function processAutoHighlightingJob(job: Job<AutoHighlightingJobData>): Promise<void> {
  const jobLog = log.child({ jobId: job.id });
  jobLog.info('Starting auto-highlighting job');

  // Validate job data
  const data = autoHighlightingJobSchema.parse(job.data);
  const { sourceId, projectId, schemaName } = data;

  jobLog.info({ sourceId, projectId, schemaName }, 'Job data validated');

  try {
    // Step 1: Get project and check if auto-tagging is enabled
    const project = await getProjectById(schemaName, projectId);

    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    if (!project.autoTaggingEnabled) {
      jobLog.info('Auto-tagging is disabled for this project, skipping');

      // Update source status to indicate it was skipped
      await withTenantSchema(schemaName, async (client) => {
        await client.query(
          'UPDATE sources SET auto_tagging_status = $1, updated_at = NOW() WHERE id = $2',
          ['COMPLETED', sourceId]
        );
      });

      return;
    }

    // Step 2: Update source status to PROCESSING
    await withTenantSchema(schemaName, async (client) => {
      await client.query(
        'UPDATE sources SET auto_tagging_status = $1, updated_at = NOW() WHERE id = $2',
        ['PROCESSING', sourceId]
      );
    });

    await job.updateProgress(10);

    // Step 3: Fetch all transcript segments for this source
    const segments = await withTenantSchema(schemaName, async (client) => {
      const result = await client.query(
        `SELECT id, content, start_time, end_time, speaker_id
         FROM transcript_segments
         WHERE source_id = $1
         ORDER BY start_time ASC`,
        [sourceId]
      );
      return result.rows.map((row) => ({
        id: row.id,
        content: row.content,
        startTime: row.start_time,
        endTime: row.end_time,
        speakerId: row.speaker_id,
      }));
    });

    if (segments.length === 0) {
      jobLog.warn('No segments found for source, skipping auto-highlighting');

      await withTenantSchema(schemaName, async (client) => {
        await client.query(
          'UPDATE sources SET auto_tagging_status = $1, updated_at = NOW() WHERE id = $2',
          ['COMPLETED', sourceId]
        );
      });

      return;
    }

    jobLog.info({ segmentCount: segments.length }, 'Fetched transcript segments');
    await job.updateProgress(20);

    // Step 4: Fetch all available tags for the project
    const tags = await withTenantSchema(schemaName, async (client) => {
      const result = await client.query(
        `SELECT name, description FROM tags WHERE project_id = $1`,
        [projectId]
      );
      return result.rows.map((row) => ({
        name: row.name,
        description: row.description,
      }));
    });

    if (tags.length === 0) {
      jobLog.warn('No tags found for project, skipping auto-highlighting');

      await withTenantSchema(schemaName, async (client) => {
        await client.query(
          'UPDATE sources SET auto_tagging_status = $1, updated_at = NOW() WHERE id = $2',
          ['COMPLETED', sourceId]
        );
      });

      return;
    }

    jobLog.info({ tagCount: tags.length }, 'Fetched project tags');
    await job.updateProgress(30);

    // Step 5: Get organization AI config
    const orgId = await getDefaultOrganizationId();
    const orgConfig = await getOrganizationAIConfig(orgId);

    if (!orgConfig) {
      throw new Error('Organization AI config not found');
    }

    // Step 6: Get AI provider
    const provider = getGeneralAIProvider(orgConfig);

    if (!provider.generateText) {
      throw new Error('AI provider does not support text generation');
    }

    jobLog.info({ provider: provider.name }, 'AI provider ready');
    await job.updateProgress(40);

    // Step 7: Build prompt with project context
    const projectContext = extractProjectContext(project);
    const userGuidelines = project.autoTaggingPrompt;

    const prompt = buildBatchAutoTaggingPrompt(
      { segments, availableTags: tags },
      projectContext,
      userGuidelines
    );

    jobLog.info(
      { promptLength: prompt.length, segmentCount: segments.length, tagCount: tags.length },
      'Built batch auto-tagging prompt'
    );
    await job.updateProgress(50);

    // Step 8: Call AI provider
    jobLog.info('Calling AI provider for batch analysis');
    const aiResponse = await provider.generateText(prompt, {
      maxTokens: 4000, // Enough for batch responses
      temperature: 0.3, // Lower for consistent tagging
    });

    jobLog.info({ responseLength: aiResponse.length }, 'Received AI response');
    await job.updateProgress(70);

    // Step 9: Parse AI response
    const parsed = parseAIResponse<AIResponse>(aiResponse, jobLog);

    if (!parsed.highlights || !Array.isArray(parsed.highlights)) {
      throw new Error('AI response missing highlights array');
    }

    jobLog.info({ suggestionsCount: parsed.highlights.length }, 'Parsed AI suggestions');

    // Step 10: Filter by confidence threshold
    const confidenceFiltered = parsed.highlights.filter((h) => {
      const confidence = h.confidence ?? 1.0; // Default to high confidence if not provided
      return confidence >= CONFIDENCE_THRESHOLD;
    });

    jobLog.info(
      {
        totalSuggestions: parsed.highlights.length,
        confidenceFiltered: confidenceFiltered.length,
        threshold: CONFIDENCE_THRESHOLD,
      },
      'Filtered suggestions by confidence'
    );

    // Step 10.5: Validate segment IDs exist (filter out hallucinated IDs)
    const validSegmentIds = new Set(segments.map((s) => s.id));
    const filteredSuggestions = confidenceFiltered.filter((h) => {
      const isValid = validSegmentIds.has(h.segmentId);
      if (!isValid) {
        jobLog.warn(
          { segmentId: h.segmentId, tagNames: h.tagNames },
          'Filtering out suggestion with invalid/hallucinated segment ID'
        );
      }
      return isValid;
    });

    if (filteredSuggestions.length < confidenceFiltered.length) {
      jobLog.warn(
        {
          validSuggestions: filteredSuggestions.length,
          invalidSuggestions: confidenceFiltered.length - filteredSuggestions.length,
        },
        'Some AI suggestions had invalid segment IDs and were filtered out'
      );
    }

    await job.updateProgress(80);

    // Step 11: Create AI suggestions in database
    if (filteredSuggestions.length > 0) {
      const suggestionInputs: AISuggestionInput[] = filteredSuggestions.map((s) => ({
        sourceId,
        segmentId: s.segmentId,
        tagNames: s.tagNames,
        selectedText: s.selectedText || null,
        confidence: s.confidence ?? null,
        aiNote: s.note || null,
      }));

      await createAISuggestionsBatch(schemaName, suggestionInputs);

      jobLog.info({ createdCount: suggestionInputs.length }, 'Created AI suggestions in database');
    } else {
      jobLog.info('No suggestions met confidence threshold, none created');
    }

    await job.updateProgress(90);

    // Step 12: Update source status to PENDING_REVIEW
    await withTenantSchema(schemaName, async (client) => {
      await client.query(
        'UPDATE sources SET auto_tagging_status = $1, updated_at = NOW() WHERE id = $2',
        [filteredSuggestions.length > 0 ? 'PENDING_REVIEW' : 'COMPLETED', sourceId]
      );
    });

    await job.updateProgress(100);
    jobLog.info('Auto-highlighting job completed successfully');
  } catch (error) {
    jobLog.error({ error }, 'Auto-highlighting job failed');

    // Update source status to FAILED
    try {
      await withTenantSchema(schemaName, async (client) => {
        await client.query(
          'UPDATE sources SET auto_tagging_status = $1, updated_at = NOW() WHERE id = $2',
          ['FAILED', sourceId]
        );
      });
    } catch (updateError) {
      jobLog.error({ error: updateError }, 'Failed to update source status to FAILED');
    }

    throw error;
  }
}

/**
 * Worker instance
 */
export const autoHighlightingWorker = new Worker<AutoHighlightingJobData>(
  QueueName.AUTO_HIGHLIGHTING,
  processAutoHighlightingJob,
  {
    connection: connectionOptions,
    concurrency: parseInt(process.env.WORKER_CONCURRENCY || '2', 10),
  }
);

/**
 * Event handlers
 */
autoHighlightingWorker.on('completed', (job) => {
  log.info({ jobId: job.id, sourceId: job.data.sourceId }, 'Auto-highlighting job completed');
});

autoHighlightingWorker.on('failed', (job, error) => {
  log.error(
    {
      jobId: job?.id,
      sourceId: job?.data?.sourceId,
      error,
    },
    'Auto-highlighting job failed'
  );
});

autoHighlightingWorker.on('error', (error) => {
  log.error({ error }, 'Auto-highlighting worker error');
});

/**
 * Graceful shutdown
 */
export async function shutdownAutoHighlightingWorker(): Promise<void> {
  log.info('Shutting down auto-highlighting worker');
  await autoHighlightingWorker.close();
  log.info('Auto-highlighting worker shut down');
}
