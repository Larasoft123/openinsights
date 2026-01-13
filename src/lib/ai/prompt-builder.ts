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

const SOURCE_SUMMARY_SYSTEM_PROMPT = `You are a qualitative research assistant analyzing interview transcripts. Your task is to generate a concise narrative summary organized by key topics discussed.`;

const SOURCE_SUMMARY_OUTPUT_FORMAT = `Generate a JSON response with this exact structure (no markdown, just raw JSON):
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

const PROJECT_SUMMARY_SYSTEM_PROMPT = `You are a qualitative research assistant synthesizing findings from multiple interview sources. Your task is to identify patterns, key findings, and actionable recommendations across all sources.`;

const PROJECT_SUMMARY_OUTPUT_FORMAT = `Generate a JSON response with this exact structure (no markdown, just raw JSON):
{
  "researchObjectives": ["objective1", "objective2"],
  "keyFindings": ["finding1", "finding2", "finding3", "finding4", "finding5"],
  "participantOverview": {"count": SOURCE_COUNT, "description": "brief description"},
  "recommendations": ["recommendation1", "recommendation2"]
}

Requirements:
- researchObjectives: 2-3 inferred research goals based on topics across all sources
- keyFindings: 5-7 cross-session patterns and insights
- participantOverview: summary of who was interviewed
- recommendations: 2-3 suggested next steps

Return ONLY valid JSON, no explanations or markdown.`;

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

const THEME_NAMING_SYSTEM_PROMPT = `You are a qualitative research assistant. Based on these highlight quotes from user research interviews, suggest a concise theme name and brief description.`;

const THEME_NAMING_OUTPUT_FORMAT = `Respond ONLY with valid JSON in this exact format (no markdown, no explanation):
{"name": "Short theme name (2-4 words)", "description": "One sentence describing what this theme captures"}

Focus on the common pattern or insight across these quotes. Be specific and research-oriented.`;

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

const AUTO_TAGGING_SYSTEM_PROMPT = `You are a qualitative research assistant. Your task is to suggest the most appropriate tag(s) for a highlight from a research interview.`;

const AUTO_TAGGING_OUTPUT_FORMAT = `Respond ONLY with valid JSON in this exact format (no markdown, no explanation):
{"tagNames": ["tag1", "tag2"]}

Only suggest tags from the available list. Suggest 1-3 most relevant tags.`;

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
