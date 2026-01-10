import { prisma } from '../db';

export interface HighlightFilters {
  tagIds?: string[];
  sourceIds?: string[];
}

/**
 * Get highlights for a project with optional filtering
 *
 * @param projectId - The project ID to filter highlights by
 * @param filters - Optional filters for tags and sources
 * @returns Highlights with tag, segment, and source information
 */
export async function getProjectHighlights(projectId: string, filters?: HighlightFilters) {
  const { tagIds, sourceIds } = filters || {};

  const highlights = await prisma.highlight.findMany({
    where: {
      segment: {
        source: {
          projectId,
          ...(sourceIds && sourceIds.length > 0 ? { id: { in: sourceIds } } : {}),
        },
      },
      ...(tagIds && tagIds.length > 0 ? { tagId: { in: tagIds } } : {}),
    },
    include: {
      tag: {
        select: {
          id: true,
          name: true,
          color: true,
        },
      },
      segment: {
        select: {
          id: true,
          content: true,
          startTime: true,
          endTime: true,
          speakerId: true,
          source: {
            select: {
              id: true,
              title: true,
              fileUrl: true,
            },
          },
        },
      },
    },
    orderBy: [{ tag: { name: 'asc' } }, { segment: { startTime: 'asc' } }],
  });

  return highlights;
}
