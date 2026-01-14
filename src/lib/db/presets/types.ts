import type { Preset as PrismaPreset } from '@prisma/client';
import type { MetadataFieldType } from '../tenant-queries/types';

// ============================================
// PRESET CATEGORIES
// ============================================

export const PRESET_CATEGORIES = [
  'DISCOVERY',
  'USABILITY',
  'VOICE_OF_CUSTOMER',
  'COMPETITIVE',
  'SALES',
  'SUPPORT',
  'OTHER',
] as const;

export type PresetCategory = (typeof PRESET_CATEGORIES)[number];

// ============================================
// PRESET VISIBILITY
// ============================================

export const PRESET_VISIBILITIES = ['PRIVATE', 'TEAM', 'COMMUNITY'] as const;

export type PresetVisibility = (typeof PRESET_VISIBILITIES)[number];

// ============================================
// PRESET CONFIG STRUCTURE
// ============================================

/**
 * Tag definition for preset configuration.
 * When a preset is applied, these tags are created in the project.
 */
export interface PresetTagDefinition {
  name: string;
  color: string;
  description?: string;
}

/**
 * Metadata field definition for preset configuration.
 * When a preset is applied, these fields are created in the project.
 */
export interface PresetMetadataFieldDefinition {
  name: string; // slug: participant_segment
  label: string; // display: Participant Segment
  fieldType: MetadataFieldType; // 'TEXT' | 'SELECT' | 'BOOLEAN' | 'NUMBER' | 'DATE'
  options?: string[]; // for SELECT type
  required?: boolean;
  placeholder?: string;
}

/**
 * AI prompts configuration for preset.
 * When a preset is applied, these prompts are copied to the project's AI config.
 */
export interface PresetAIPrompts {
  sourceSummaryPrompt?: string;
  projectSummaryPrompt?: string;
  themeNamingPrompt?: string;
  autoTaggingPrompt?: string;
  autoTaggingEnabled?: boolean;
}

/**
 * Project settings for preset.
 * When a preset is applied, these settings are copied to the project.
 */
export interface PresetProjectSettings {
  projectType?: string;
  goals?: string;
  context?: string;
}

/**
 * Complete preset configuration stored as JSONB.
 */
export interface PresetConfig {
  tags: PresetTagDefinition[];
  metadataFields: PresetMetadataFieldDefinition[];
  aiPrompts: PresetAIPrompts;
  projectSettings: PresetProjectSettings;
}

// ============================================
// PRESET TYPES
// ============================================

/**
 * Preset with typed config (extends Prisma type).
 */
export interface Preset extends Omit<PrismaPreset, 'config'> {
  config: PresetConfig;
}

/**
 * Preset with author information for display.
 */
export interface PresetWithAuthor extends Preset {
  author: {
    id: string;
    name: string | null;
    email: string;
  };
}

/**
 * Preset summary for list views (excludes full config).
 */
export interface PresetSummary {
  id: string;
  name: string;
  description: string | null;
  category: PresetCategory;
  visibility: PresetVisibility;
  isOfficial: boolean;
  useCount: number;
  createdAt: Date;
  updatedAt: Date;
  author: {
    id: string;
    name: string | null;
  };
  // Preview counts for UI
  preview: {
    tagCount: number;
    metadataFieldCount: number;
    hasAIPrompts: boolean;
  };
}

// ============================================
// API INPUT TYPES
// ============================================

export interface CreatePresetInput {
  name: string;
  description?: string;
  category: PresetCategory;
  config: PresetConfig;
}

export interface UpdatePresetInput {
  name?: string;
  description?: string;
  category?: PresetCategory;
  config?: PresetConfig;
}
