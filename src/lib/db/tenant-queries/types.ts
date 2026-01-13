/**
 * Default tenant schema for self-hosted mode.
 * In cloud SaaS, this would be dynamically determined from share link routing.
 */
export const DEFAULT_TENANT_SCHEMA = 'tenant_default';

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface TenantProject {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  language: string; // ISO 639-1 code (e.g., 'en', 'ru', 'es')
  archivedAt: Date | null;
  summary: Record<string, unknown> | null;
  summaryStatus: string;
  summaryGeneratedAt: Date | null;
  // Project Settings (Research Templates foundation)
  projectType: string | null;
  goals: string | null;
  context: string | null;
  deadline: Date | null;
  stakeholder: string | null;
  researchQuestions: string | null;
  targetParticipants: number | null;
  recruitmentCriteria: string | null;
  createdAt: Date;
  updatedAt: Date;
  _count?: {
    sources: number;
    highlights: number;
  };
}

export interface TenantSource {
  id: string;
  projectId: string;
  title: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  duration: number | null;
  status: string;
  language: string; // 'auto' = detect, or ISO 639-1 code
  detectedLanguage: string | null; // Filled by AI detection if language='auto'
  processingStep: string | null;
  processingProgress: number;
  processingStartedAt: Date | null;
  deletedAt: Date | null;
  thumbnailUrl: string | null;
  summary: Record<string, unknown> | null;
  summaryStatus: string;
  summaryGeneratedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  _count?: {
    segments: number;
  };
}

export interface TenantSegment {
  id: string;
  sourceId: string;
  content: string;
  startTime: number;
  endTime: number;
  speakerId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TenantTag {
  id: string;
  projectId: string;
  name: string;
  color: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  _count?: {
    highlights: number;
  };
}

export interface TenantTheme {
  id: string;
  projectId: string;
  name: string;
  description: string | null;
  color: string;
  createdAt: Date;
  updatedAt: Date;
  _count?: {
    highlights: number;
  };
}

export interface TenantHighlight {
  id: string;
  segmentId: string;
  tagId: string;
  note: string | null;
  selectedText: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TenantWorkspace {
  id: string;
  name: string;
  slug: string;
  aiProvider: string | null;
  openaiTranscriptionModel: string | null;
  embeddingProvider: string | null;
  geminiApiKey: string | null;
  openaiApiKey: string | null;
  ollamaBaseUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TenantShareLink {
  id: string;
  token: string;
  projectId: string;
  sourceId: string | null;
  shareType: 'project' | 'source';
  includeEvidence: boolean;
  includeInsights: boolean;
  createdById: string;
  isActive: boolean;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TenantSpeakerName {
  id: string;
  projectId: string;
  speakerId: string;
  customName: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// UTILITY TYPES
// ============================================

export type SnakeToCamel<S extends string> = S extends `${infer T}_${infer U}`
  ? `${T}${Capitalize<SnakeToCamel<U>>}`
  : S;

export type CamelCaseObject<T> = {
  [K in keyof T as K extends string ? SnakeToCamel<K> : K]: T[K];
};
