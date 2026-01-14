import { prisma } from '../db';
import { encryptApiKey, decryptApiKey, maskApiKey } from '../crypto/keys';
import type { OrganizationAIConfig } from '../ai/types';
import { EMBEDDING_DIMENSION } from '../ai';
import { logger } from '../logger';

const log = logger.child({ service: 'organization-settings' });

// ============================================
// Response Types
// ============================================

/**
 * Organization AI settings for display (with masked API keys)
 */
export interface OrganizationSettingsResponse {
  // Transcription settings
  transcriptionProvider: string | null;
  hasDeepgramApiKey: boolean;
  hasAssemblyaiApiKey: boolean;
  whisperxEndpoint: string | null;

  // Embedding settings (Ollama only, 768 dimensions)
  ollamaBaseUrl: string | null;
  embeddingModel: string | null;

  // General AI settings
  generalAiProvider: string | null;

  // Model selection
  transcriptionModel: string | null;
  generalAiModel: string | null;

  // Shared API keys (masked for display)
  openaiApiKey: string | null;
  geminiApiKey: string | null;
  hasOpenaiApiKey: boolean;
  hasGeminiApiKey: boolean;
}

/**
 * Update input type for organization settings API
 */
export interface UpdateOrganizationSettingsInput {
  // Transcription settings
  transcriptionProvider?: string | null;
  deepgramApiKey?: string | null;
  assemblyaiApiKey?: string | null;
  whisperxEndpoint?: string | null;

  // Embedding settings (Ollama only)
  ollamaBaseUrl?: string | null;
  embeddingModel?: string | null;

  // General AI settings
  generalAiProvider?: string | null;

  // Model selection (undefined = don't change, null/empty = clear/use default)
  transcriptionModel?: string | null;
  generalAiModel?: string | null;

  // Shared API keys (undefined = don't change, null/empty = clear, string = set new)
  openaiApiKey?: string | null;
  geminiApiKey?: string | null;
}

// ============================================
// Service Functions
// ============================================

/**
 * Get organization AI configuration for workers (decrypted keys)
 *
 * Used by workers to get the actual API keys for making API calls.
 * This should NEVER be exposed to the frontend.
 */
export async function getOrganizationAIConfig(
  organizationId: string
): Promise<OrganizationAIConfig | null> {
  try {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        transcriptionProvider: true,
        encryptedDeepgramKey: true,
        encryptedAssemblyaiKey: true,
        whisperxEndpoint: true,
        embeddingProvider: true,
        embeddingDimension: true,
        ollamaBaseUrl: true,
        generalAiProvider: true,
        transcriptionModel: true,
        embeddingModel: true,
        generalAiModel: true,
        encryptedOpenaiKey: true,
        encryptedGeminiKey: true,
      },
    });

    if (!org) {
      log.warn({ organizationId }, 'Organization not found');
      return null;
    }

    // Build config with decrypted API keys
    // Embedding is always Ollama with 768 dimensions
    const config: OrganizationAIConfig = {
      transcriptionProvider:
        org.transcriptionProvider as OrganizationAIConfig['transcriptionProvider'],
      deepgramApiKey: org.encryptedDeepgramKey ? decryptApiKey(org.encryptedDeepgramKey) : null,
      assemblyaiApiKey: org.encryptedAssemblyaiKey
        ? decryptApiKey(org.encryptedAssemblyaiKey)
        : null,
      whisperxEndpoint: org.whisperxEndpoint,
      embeddingProvider: 'ollama', // Always Ollama
      embeddingDimension: EMBEDDING_DIMENSION, // Always 768
      ollamaBaseUrl: org.ollamaBaseUrl,
      generalAiProvider: org.generalAiProvider as OrganizationAIConfig['generalAiProvider'],
      transcriptionModel: org.transcriptionModel,
      embeddingModel: org.embeddingModel,
      generalAiModel: org.generalAiModel,
      openaiApiKey: org.encryptedOpenaiKey ? decryptApiKey(org.encryptedOpenaiKey) : null,
      geminiApiKey: org.encryptedGeminiKey ? decryptApiKey(org.encryptedGeminiKey) : null,
    };

    log.debug({ organizationId }, 'Retrieved organization AI config');
    return config;
  } catch (error) {
    log.error({ error, organizationId }, 'Failed to get organization AI config');
    throw error;
  }
}

/**
 * Get organization AI config by source ID (for workers)
 *
 * Looks up: source (tenant) -> project (tenant) -> workspace (tenant) -> user -> organization
 * This bridges the tenant schema to the public schema for settings lookup.
 */
export async function getOrganizationAIConfigBySourceId(
  organizationId: string
): Promise<OrganizationAIConfig | null> {
  // For now, we directly use the organizationId passed from the worker
  // In the future, this could do a lookup through the tenant schema
  return getOrganizationAIConfig(organizationId);
}

/**
 * Get organization settings for display (API response with masked keys)
 *
 * Returns settings with masked API keys for security.
 */
export async function getOrganizationSettingsForDisplay(
  organizationId: string
): Promise<OrganizationSettingsResponse | null> {
  try {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        transcriptionProvider: true,
        encryptedDeepgramKey: true,
        encryptedAssemblyaiKey: true,
        whisperxEndpoint: true,
        embeddingProvider: true,
        embeddingDimension: true,
        ollamaBaseUrl: true,
        generalAiProvider: true,
        transcriptionModel: true,
        embeddingModel: true,
        generalAiModel: true,
        encryptedOpenaiKey: true,
        encryptedGeminiKey: true,
      },
    });

    if (!org) {
      return null;
    }

    // Decrypt and mask keys for display
    const openaiKey = org.encryptedOpenaiKey ? decryptApiKey(org.encryptedOpenaiKey) : null;
    const geminiKey = org.encryptedGeminiKey ? decryptApiKey(org.encryptedGeminiKey) : null;

    return {
      transcriptionProvider: org.transcriptionProvider,
      hasDeepgramApiKey: !!org.encryptedDeepgramKey,
      hasAssemblyaiApiKey: !!org.encryptedAssemblyaiKey,
      whisperxEndpoint: org.whisperxEndpoint,
      // Embedding: Ollama only (768 dimensions)
      ollamaBaseUrl: org.ollamaBaseUrl,
      embeddingModel: org.embeddingModel,
      generalAiProvider: org.generalAiProvider,
      transcriptionModel: org.transcriptionModel,
      generalAiModel: org.generalAiModel,
      openaiApiKey: openaiKey ? maskApiKey(openaiKey) : null,
      geminiApiKey: geminiKey ? maskApiKey(geminiKey) : null,
      hasOpenaiApiKey: !!org.encryptedOpenaiKey,
      hasGeminiApiKey: !!org.encryptedGeminiKey,
    };
  } catch (error) {
    log.error({ error, organizationId }, 'Failed to get organization settings for display');
    throw error;
  }
}

/**
 * Update organization AI settings
 *
 * For API keys:
 * - undefined: don't change existing value
 * - null or empty string: clear the key
 * - non-empty string: encrypt and store new key
 */
export async function updateOrganizationAISettings(
  organizationId: string,
  settings: UpdateOrganizationSettingsInput
): Promise<OrganizationSettingsResponse> {
  try {
    // Build update data object
    const updateData: Record<string, string | number | null> = {};

    // Transcription settings
    if (settings.transcriptionProvider !== undefined) {
      updateData.transcriptionProvider = settings.transcriptionProvider;
    }
    if (settings.deepgramApiKey !== undefined) {
      updateData.encryptedDeepgramKey = settings.deepgramApiKey
        ? encryptApiKey(settings.deepgramApiKey)
        : null;
    }
    if (settings.assemblyaiApiKey !== undefined) {
      updateData.encryptedAssemblyaiKey = settings.assemblyaiApiKey
        ? encryptApiKey(settings.assemblyaiApiKey)
        : null;
    }
    if (settings.whisperxEndpoint !== undefined) {
      updateData.whisperxEndpoint = settings.whisperxEndpoint || null;
    }

    // Embedding settings (Ollama only - just URL and model)
    if (settings.ollamaBaseUrl !== undefined) {
      updateData.ollamaBaseUrl = settings.ollamaBaseUrl || null;
    }
    if (settings.embeddingModel !== undefined) {
      updateData.embeddingModel = settings.embeddingModel || null;
    }

    // General AI settings
    if (settings.generalAiProvider !== undefined) {
      updateData.generalAiProvider = settings.generalAiProvider;
    }

    // Model selection
    if (settings.transcriptionModel !== undefined) {
      updateData.transcriptionModel = settings.transcriptionModel || null;
    }
    if (settings.generalAiModel !== undefined) {
      updateData.generalAiModel = settings.generalAiModel || null;
    }

    // Shared API keys
    if (settings.openaiApiKey !== undefined) {
      updateData.encryptedOpenaiKey = settings.openaiApiKey
        ? encryptApiKey(settings.openaiApiKey)
        : null;
    }
    if (settings.geminiApiKey !== undefined) {
      updateData.encryptedGeminiKey = settings.geminiApiKey
        ? encryptApiKey(settings.geminiApiKey)
        : null;
    }

    // If nothing to update, just return current settings
    if (Object.keys(updateData).length === 0) {
      const current = await getOrganizationSettingsForDisplay(organizationId);
      if (!current) {
        throw new Error('Organization not found');
      }
      return current;
    }

    // Update organization
    await prisma.organization.update({
      where: { id: organizationId },
      data: updateData,
    });

    log.info({ organizationId }, 'Updated organization AI settings');

    // Return updated settings
    const updated = await getOrganizationSettingsForDisplay(organizationId);
    if (!updated) {
      throw new Error('Organization not found after update');
    }
    return updated;
  } catch (error) {
    log.error({ error, organizationId }, 'Failed to update organization AI settings');
    throw error;
  }
}

/**
 * Get the default organization ID for self-hosted mode
 *
 * In self-hosted mode, there's always exactly one organization called "Default Organization"
 * with slug "default". This function finds or creates it.
 */
export async function getDefaultOrganizationId(): Promise<string> {
  // Try to find existing default org
  let org = await prisma.organization.findUnique({
    where: { slug: 'default' },
    select: { id: true },
  });

  if (!org) {
    // Create default organization for self-hosted mode
    org = await prisma.organization.create({
      data: {
        name: 'Default Organization',
        slug: 'default',
        schemaName: 'tenant_default',
      },
      select: { id: true },
    });
    log.info({ organizationId: org.id }, 'Created default organization for self-hosted mode');
  }

  return org.id;
}

/**
 * Get organization ID for a user
 *
 * Returns the organization ID for the user's membership.
 * For self-hosted mode with single organization, this will be the default org.
 */
export async function getOrganizationIdForUser(userId: string): Promise<string | null> {
  // First check if user has a membership
  const membership = await prisma.organizationMember.findFirst({
    where: { userId },
    select: { organizationId: true },
  });

  if (membership) {
    return membership.organizationId;
  }

  // For self-hosted mode, get the default org
  // In the future, this could return null for cloud SaaS when user has no orgs
  return getDefaultOrganizationId();
}
