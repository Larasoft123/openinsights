/**
 * Centralized Prompt Builder for AI Tasks
 *
 * This module provides a consistent way to build prompts for all AI tasks.
 * Prompts are structured as:
 * 1. System prompt (our instructions - defines role, task, behavior)
 * 2. Project context (from project settings - goals, research questions, etc.)
 * 3. User guidelines (optional custom instructions from project settings)
 * 4. Data (task-specific - transcript, sources, highlights)
 * 5. Output format (JSON structure requirements)
 *
 * The user's custom prompt field is treated as "guidelines" - additional instructions
 * that augment our system prompt, NOT a complete prompt replacement.
 */

import type { TenantProject } from '../db/tenant-queries/types';

// ============================================
// TYPES
// ============================================

export type PromptTask = 'source_summary' | 'project_summary' | 'theme_naming' | 'auto_tagging';

/**
 * Project context fields used in prompt building.
 * Extracted from TenantProject to provide research context to AI.
 */
export interface ProjectContext {
  projectType: string | null;
  goals: string | null;
  context: string | null;
  researchQuestions: string | null;
  // Transcription hints - useful for domain-specific terminology
  transcriptionVocabulary: string | null;
  transcriptionContext: string | null;
}

/**
 * Extract project context from a TenantProject
 */
export function extractProjectContext(project: TenantProject | null): ProjectContext {
  if (!project) {
    return {
      projectType: null,
      goals: null,
      context: null,
      researchQuestions: null,
      transcriptionVocabulary: null,
      transcriptionContext: null,
    };
  }
  return {
    projectType: project.projectType,
    goals: project.goals,
    context: project.context,
    researchQuestions: project.researchQuestions,
    transcriptionVocabulary: project.transcriptionVocabulary,
    transcriptionContext: project.transcriptionContext,
  };
}

// ============================================
// SOURCE SUMMARY
// ============================================

export interface SourceSummaryData {
  transcript: string;
  durationMinutes: number;
  segmentCount: number;
  speakers: string;
}

const SOURCE_SUMMARY_SYSTEM_PROMPT = `Create a summary of this interview transcript.`;

const SOURCE_SUMMARY_OUTPUT_FORMAT = `Return ONLY valid JSON (no markdown):
{"narrative": "Your summary here"}`;

export function buildSourceSummaryPrompt(
  data: SourceSummaryData,
  projectContext: ProjectContext,
  userGuidelines?: string | null
): string {
  const sections: string[] = [];

  // 1. System prompt
  sections.push(SOURCE_SUMMARY_SYSTEM_PROMPT);

  // 2. Project context (if any fields are set)
  const contextSection = buildProjectContextSection(projectContext);
  if (contextSection) {
    sections.push(contextSection);
  }

  // 3. User guidelines (if provided)
  if (userGuidelines?.trim()) {
    sections.push(`ADDITIONAL GUIDELINES:\n${userGuidelines.trim()}`);
  }

  // 4. Data
  sections.push(`TRANSCRIPT:
${data.transcript}

METADATA:
- Duration: ${data.durationMinutes} minutes
- Segments: ${data.segmentCount}
- Speakers: ${data.speakers}`);

  // 5. Output format
  sections.push(SOURCE_SUMMARY_OUTPUT_FORMAT);

  return sections.join('\n\n');
}

// ============================================
// PROJECT SUMMARY
// ============================================

export interface ProjectSummaryData {
  sourcesJson: string;
  sourceCount: number;
}

const PROJECT_SUMMARY_SYSTEM_PROMPT = `Synthesize findings from these interview summaries into a project-level overview.`;

const PROJECT_SUMMARY_OUTPUT_FORMAT = `Return ONLY valid JSON (no markdown):
{
  "researchObjectives": ["inferred research goals"],
  "keyFindings": ["cross-session patterns and insights"],
  "participantOverview": {"count": SOURCE_COUNT, "description": "who was interviewed"},
  "recommendations": ["suggested next steps"]
}`;

export function buildProjectSummaryPrompt(
  data: ProjectSummaryData,
  projectContext: ProjectContext,
  userGuidelines?: string | null
): string {
  const sections: string[] = [];

  // 1. System prompt
  sections.push(PROJECT_SUMMARY_SYSTEM_PROMPT);

  // 2. Project context (if any fields are set)
  const contextSection = buildProjectContextSection(projectContext);
  if (contextSection) {
    sections.push(contextSection);
  }

  // 3. User guidelines (if provided)
  if (userGuidelines?.trim()) {
    sections.push(`ADDITIONAL GUIDELINES:\n${userGuidelines.trim()}`);
  }

  // 4. Data
  sections.push(`SOURCES:\n${data.sourcesJson}`);

  // 5. Output format (with dynamic source count)
  const outputFormat = PROJECT_SUMMARY_OUTPUT_FORMAT.replace(
    /SOURCE_COUNT/g,
    String(data.sourceCount)
  );
  sections.push(outputFormat);

  return sections.join('\n\n');
}

// ============================================
// THEME NAMING
// ============================================

export interface ThemeNamingData {
  highlights: string[];
}

const THEME_NAMING_SYSTEM_PROMPT = `Suggest a theme name and description for these highlight quotes from research interviews.`;

const THEME_NAMING_OUTPUT_FORMAT = `Return ONLY valid JSON (no markdown):
{"name": "theme name", "description": "what this theme captures"}`;

export function buildThemeNamingPrompt(
  data: ThemeNamingData,
  projectContext: ProjectContext,
  userGuidelines?: string | null
): string {
  const sections: string[] = [];

  // 1. System prompt
  sections.push(THEME_NAMING_SYSTEM_PROMPT);

  // 2. Project context (if any fields are set)
  const contextSection = buildProjectContextSection(projectContext);
  if (contextSection) {
    sections.push(contextSection);
  }

  // 3. User guidelines (if provided)
  if (userGuidelines?.trim()) {
    sections.push(`ADDITIONAL GUIDELINES:\n${userGuidelines.trim()}`);
  }

  // 4. Data - format highlights as numbered list
  const highlightsList = data.highlights
    .slice(0, 5)
    .map((h, i) => `${i + 1}. "${h}"`)
    .join('\n');
  sections.push(`HIGHLIGHTS:\n${highlightsList}`);

  // 5. Output format
  sections.push(THEME_NAMING_OUTPUT_FORMAT);

  return sections.join('\n\n');
}

// ============================================
// AUTO TAGGING (placeholder for future)
// ============================================

export interface AutoTaggingData {
  highlightText: string;
  availableTags: { name: string; description?: string }[];
}

const AUTO_TAGGING_SYSTEM_PROMPT = `Suggest the most appropriate tags for this highlight from the available list.`;

const AUTO_TAGGING_OUTPUT_FORMAT = `Return ONLY valid JSON (no markdown):
{"tagNames": ["tag1", "tag2"]}`;

export function buildAutoTaggingPrompt(
  data: AutoTaggingData,
  projectContext: ProjectContext,
  userGuidelines?: string | null
): string {
  const sections: string[] = [];

  // 1. System prompt
  sections.push(AUTO_TAGGING_SYSTEM_PROMPT);

  // 2. Project context (if any fields are set)
  const contextSection = buildProjectContextSection(projectContext);
  if (contextSection) {
    sections.push(contextSection);
  }

  // 3. User guidelines (if provided)
  if (userGuidelines?.trim()) {
    sections.push(`ADDITIONAL GUIDELINES:\n${userGuidelines.trim()}`);
  }

  // 4. Data
  const tagsList = data.availableTags
    .map((t) => (t.description ? `- ${t.name}: ${t.description}` : `- ${t.name}`))
    .join('\n');
  sections.push(`HIGHLIGHT:\n"${data.highlightText}"

AVAILABLE TAGS:\n${tagsList}`);

  // 5. Output format
  sections.push(AUTO_TAGGING_OUTPUT_FORMAT);

  return sections.join('\n\n');
}

// ============================================
// HELPERS
// ============================================

/**
 * Build project context section from research setup fields.
 * Returns null if no context fields are set.
 */
function buildProjectContextSection(ctx: ProjectContext): string | null {
  const parts: string[] = [];

  if (ctx.projectType?.trim()) {
    parts.push(`Project Type: ${ctx.projectType.trim()}`);
  }
  if (ctx.goals?.trim()) {
    parts.push(`Research Goals: ${ctx.goals.trim()}`);
  }
  if (ctx.context?.trim()) {
    parts.push(`Context: ${ctx.context.trim()}`);
  }
  if (ctx.researchQuestions?.trim()) {
    parts.push(`Research Questions: ${ctx.researchQuestions.trim()}`);
  }
  // Include domain-specific vocabulary/context if available
  if (ctx.transcriptionVocabulary?.trim()) {
    parts.push(`Domain Vocabulary: ${ctx.transcriptionVocabulary.trim()}`);
  }
  if (ctx.transcriptionContext?.trim()) {
    parts.push(`Domain Context: ${ctx.transcriptionContext.trim()}`);
  }

  if (parts.length === 0) {
    return null;
  }

  return `PROJECT CONTEXT:\n${parts.join('\n')}`;
}
