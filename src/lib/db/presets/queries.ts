import { prisma } from '@/lib/db';
import type { Prisma, Preset as PrismaPreset } from '@prisma/client';
import type {
  Preset,
  PresetWithAuthor,
  PresetSummary,
  PresetConfig,
  PresetCategory,
  PresetVisibility,
} from './types';

/**
 * Parse Prisma JSON field to PresetConfig.
 */
function parsePresetConfig(config: PrismaPreset['config']): PresetConfig {
  return config as unknown as PresetConfig;
}

/**
 * Convert PresetConfig to Prisma JSON input.
 */
function toJsonInput(config: PresetConfig): Prisma.InputJsonValue {
  return config as unknown as Prisma.InputJsonValue;
}

// ============================================
// PRESET QUERIES (Prisma - public schema)
// ============================================

/**
 * List presets visible to the user.
 * Returns official presets + user's personal presets.
 */
export async function listPresets(
  userId: string,
  options?: {
    category?: PresetCategory;
    includeOfficial?: boolean;
  }
): Promise<PresetSummary[]> {
  const { category, includeOfficial = true } = options || {};

  const where: Prisma.PresetWhereInput = {
    OR: [
      // User's personal presets
      { authorId: userId, visibility: 'PRIVATE' },
      // Official presets (if includeOfficial is true)
      ...(includeOfficial ? [{ isOfficial: true }] : []),
    ],
    ...(category && { category }),
  };

  const presets = await prisma.preset.findMany({
    where,
    include: {
      author: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: [{ isOfficial: 'desc' }, { useCount: 'desc' }, { createdAt: 'desc' }],
  });

  return presets.map((preset) => {
    const config = parsePresetConfig(preset.config);
    return {
      id: preset.id,
      name: preset.name,
      description: preset.description,
      category: preset.category as PresetCategory,
      visibility: preset.visibility as PresetVisibility,
      isOfficial: preset.isOfficial,
      useCount: preset.useCount,
      createdAt: preset.createdAt,
      updatedAt: preset.updatedAt,
      author: {
        id: preset.author.id,
        name: preset.author.name,
      },
      preview: {
        tagCount: config.tags?.length || 0,
        metadataFieldCount: config.metadataFields?.length || 0,
        hasAIPrompts: Boolean(
          config.aiPrompts?.sourceSummaryPrompt ||
          config.aiPrompts?.projectSummaryPrompt ||
          config.aiPrompts?.themeNamingPrompt ||
          config.aiPrompts?.autoTaggingPrompt
        ),
      },
    };
  });
}

/**
 * Get a single preset by ID.
 * Returns null if not found or not accessible.
 */
export async function getPresetById(
  presetId: string,
  userId: string
): Promise<PresetWithAuthor | null> {
  const preset = await prisma.preset.findFirst({
    where: {
      id: presetId,
      OR: [
        // User's personal presets
        { authorId: userId },
        // Official presets
        { isOfficial: true },
      ],
    },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  if (!preset) return null;

  return {
    ...preset,
    config: parsePresetConfig(preset.config),
  } as PresetWithAuthor;
}

/**
 * Create a new preset.
 */
export async function createPreset(data: {
  name: string;
  description?: string;
  category: string;
  config: PresetConfig;
  authorId: string;
  isOfficial?: boolean;
}): Promise<Preset> {
  const preset = await prisma.preset.create({
    data: {
      name: data.name,
      description: data.description || null,
      category: data.category,
      config: toJsonInput(data.config),
      authorId: data.authorId,
      visibility: 'PRIVATE',
      isOfficial: data.isOfficial || false,
    },
  });

  return {
    ...preset,
    config: parsePresetConfig(preset.config),
  };
}

/**
 * Update an existing preset.
 * Only the author can update their preset.
 */
export async function updatePreset(
  presetId: string,
  userId: string,
  data: {
    name?: string;
    description?: string | null;
    category?: string;
    config?: PresetConfig;
  }
): Promise<Preset | null> {
  // First verify ownership
  const existing = await prisma.preset.findFirst({
    where: {
      id: presetId,
      authorId: userId,
      isOfficial: false, // Cannot update official presets
    },
  });

  if (!existing) return null;

  const preset = await prisma.preset.update({
    where: { id: presetId },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.category !== undefined && { category: data.category }),
      ...(data.config !== undefined && { config: toJsonInput(data.config) }),
    },
  });

  return {
    ...preset,
    config: parsePresetConfig(preset.config),
  };
}

/**
 * Delete a preset.
 * Only the author can delete their preset.
 */
export async function deletePreset(presetId: string, userId: string): Promise<boolean> {
  // First verify ownership
  const existing = await prisma.preset.findFirst({
    where: {
      id: presetId,
      authorId: userId,
      isOfficial: false, // Cannot delete official presets
    },
  });

  if (!existing) return false;

  await prisma.preset.delete({
    where: { id: presetId },
  });

  return true;
}

/**
 * Increment the use count for a preset.
 */
export async function incrementPresetUseCount(presetId: string): Promise<void> {
  await prisma.preset.update({
    where: { id: presetId },
    data: { useCount: { increment: 1 } },
  });
}

/**
 * Check if a preset exists and is accessible by the user.
 */
export async function canAccessPreset(presetId: string, userId: string): Promise<boolean> {
  const preset = await prisma.preset.findFirst({
    where: {
      id: presetId,
      OR: [{ authorId: userId }, { isOfficial: true }],
    },
    select: { id: true },
  });

  return !!preset;
}
