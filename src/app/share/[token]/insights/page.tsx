import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { validateShareLink } from '@/lib/services/share.service';
import { ProjectHeader } from '@/components/projects/detail/project-header';
import { InsightBoard } from '@/components/insights/insight-board';
import { SharedProjectWrapper } from '@/components/share/shared-project-wrapper';

interface PageProps {
  params: Promise<{ token: string }>;
}

/**
 * Shared Insight Board Page
 *
 * Read-only Kanban-style board for viewing organized themes.
 */
export default async function SharedInsightsPage({ params }: PageProps) {
  const { token } = await params;

  // Validate the share link
  const shareLink = await validateShareLink(token);

  if (!shareLink) {
    notFound();
  }

  // Check if insights are included in this share
  if (!shareLink.includeInsights) {
    notFound();
  }

  // Source shares don't have insights page
  if (shareLink.sourceId !== null) {
    notFound();
  }

  const projectId = shareLink.project.id;

  // Fetch project with themes and highlights
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      name: true,
      description: true,
      updatedAt: true,
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
      _count: {
        select: {
          sources: {
            where: { deletedAt: null },
          },
        },
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
          deletedAt: null,
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

  // Calculate highlights count
  const highlightsCount = await prisma.highlight.count({
    where: {
      segment: {
        source: {
          projectId,
          deletedAt: null,
        },
      },
    },
  });

  // Transform themes to include highlights directly
  const themes = project.themes.map((theme) => ({
    ...theme,
    highlights: theme.highlights.map((h) => h.highlight),
  }));

  return (
    <SharedProjectWrapper
      shareToken={token}
      basePath={`/share/${token}`}
      includeEvidence={shareLink.includeEvidence}
      includeInsights={shareLink.includeInsights}
    >
      <ProjectHeader
        projectId={projectId}
        projectName={project.name}
        description={project.description}
        workspaceName="Shared Project"
        sourcesCount={project._count.sources}
        highlightsCount={highlightsCount}
        updatedAt={project.updatedAt}
      />
      <InsightBoard
        project={{
          id: project.id,
          name: project.name,
          workspace: project.workspace,
        }}
        themes={themes}
        unassignedHighlights={unassignedHighlights}
      />
    </SharedProjectWrapper>
  );
}

export async function generateMetadata({ params }: PageProps) {
  const { token } = await params;

  const shareLink = await validateShareLink(token);

  if (!shareLink || !shareLink.includeInsights) {
    return { title: 'Not Found' };
  }

  return {
    title: `Shared Insights | ${shareLink.project.name} | OpenInsights`,
    description: `Shared insights from ${shareLink.project.name}`,
  };
}
