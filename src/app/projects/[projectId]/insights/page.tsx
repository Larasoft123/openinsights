import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { InsightBoard } from '@/components/insights/insight-board';

interface PageProps {
  params: Promise<{ projectId: string }>;
}

/**
 * Insight Board Page
 *
 * Kanban-style board for organizing highlights into themes.
 * Supports drag-and-drop between theme columns.
 */
export default async function InsightsPage({ params }: PageProps) {
  const { projectId } = await params;

  // Fetch project with themes and highlights
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      name: true,
      workspace: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      themes: {
        select: {
          id: true,
          name: true,
          description: true,
          color: true,
          highlights: {
            select: {
              highlight: {
                select: {
                  id: true,
                  note: true,
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
                      source: {
                        select: {
                          id: true,
                          title: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: { name: 'asc' },
      },
    },
  });

  if (!project) {
    notFound();
  }

  // Get unassigned highlights (not in any theme)
  const unassignedHighlights = await prisma.highlight.findMany({
    where: {
      segment: {
        source: {
          projectId,
        },
      },
      themes: {
        none: {},
      },
    },
    select: {
      id: true,
      note: true,
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
          source: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Transform themes to include highlights directly
  const themes = project.themes.map((theme) => ({
    ...theme,
    highlights: theme.highlights.map((h) => h.highlight),
  }));

  return (
    <InsightBoard
      project={{
        id: project.id,
        name: project.name,
        workspace: project.workspace,
      }}
      themes={themes}
      unassignedHighlights={unassignedHighlights}
    />
  );
}

export async function generateMetadata({ params }: PageProps) {
  const { projectId } = await params;

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { name: true },
  });

  if (!project) {
    return { title: 'Project Not Found' };
  }

  return {
    title: `Insights | ${project.name} | OpenInsights`,
    description: `Insight board for ${project.name}`,
  };
}
