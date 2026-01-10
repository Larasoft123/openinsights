import { prisma } from '@/lib/db';
import { APIError } from './auth';

/**
 * Verify user has access to a specific project
 * Ensures the project belongs to the user's workspace
 *
 * @param projectId - Project ID to verify
 * @param workspaceId - User's workspace ID
 * @throws {APIError} 404 if project not found or doesn't belong to workspace
 * @returns The project if access is granted
 *
 * @example
 * ```ts
 * const { workspaceId } = await requireAuth();
 * const project = await verifyProjectAccess(projectId, workspaceId);
 * ```
 */
export async function verifyProjectAccess(projectId: string, workspaceId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, workspaceId },
  });

  if (!project) {
    throw new APIError('Project not found', 404);
  }

  return project;
}

/**
 * Verify user has access to a specific source
 * Ensures the source's project belongs to the user's workspace
 *
 * @param sourceId - Source ID to verify
 * @param workspaceId - User's workspace ID
 * @throws {APIError} 404 if source not found or doesn't belong to workspace
 * @returns The source if access is granted
 *
 * @example
 * ```ts
 * const { workspaceId } = await requireAuth();
 * const source = await verifySourceAccess(sourceId, workspaceId);
 * ```
 */
export async function verifySourceAccess(sourceId: string, workspaceId: string) {
  const source = await prisma.source.findFirst({
    where: {
      id: sourceId,
      project: { workspaceId },
    },
  });

  if (!source) {
    throw new APIError('Source not found', 404);
  }

  return source;
}

/**
 * Verify user has access to a specific tag
 * Ensures the tag's project belongs to the user's workspace
 *
 * @param tagId - Tag ID to verify
 * @param workspaceId - User's workspace ID
 * @throws {APIError} 404 if tag not found or doesn't belong to workspace
 * @returns The tag if access is granted
 */
export async function verifyTagAccess(tagId: string, workspaceId: string) {
  const tag = await prisma.tag.findFirst({
    where: {
      id: tagId,
      project: { workspaceId },
    },
  });

  if (!tag) {
    throw new APIError('Tag not found', 404);
  }

  return tag;
}

/**
 * Verify user has access to a specific theme
 * Ensures the theme's project belongs to the user's workspace
 *
 * @param themeId - Theme ID to verify
 * @param workspaceId - User's workspace ID
 * @throws {APIError} 404 if theme not found or doesn't belong to workspace
 * @returns The theme if access is granted
 */
export async function verifyThemeAccess(themeId: string, workspaceId: string) {
  const theme = await prisma.theme.findFirst({
    where: {
      id: themeId,
      project: { workspaceId },
    },
  });

  if (!theme) {
    throw new APIError('Theme not found', 404);
  }

  return theme;
}

/**
 * Verify user has access to a specific highlight
 * Ensures the highlight's source project belongs to the user's workspace
 *
 * @param highlightId - Highlight ID to verify
 * @param workspaceId - User's workspace ID
 * @throws {APIError} 404 if highlight not found or doesn't belong to workspace
 * @returns The highlight if access is granted
 */
export async function verifyHighlightAccess(highlightId: string, workspaceId: string) {
  const highlight = await prisma.highlight.findFirst({
    where: {
      id: highlightId,
      segment: {
        source: {
          project: { workspaceId },
        },
      },
    },
  });

  if (!highlight) {
    throw new APIError('Highlight not found', 404);
  }

  return highlight;
}
