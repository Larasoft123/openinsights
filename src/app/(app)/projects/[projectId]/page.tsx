import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ProjectHeader } from '@/components/projects/detail/project-header';
import { SourcesSection } from '@/components/sources/sources-section';

interface ProjectPageProps {
  params: Promise<{ projectId: string }>;
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { projectId } = await params;
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const project = await prisma.project.findUnique({
    where: {
      id: projectId,
      workspaceId: session.user.workspaceId ?? undefined,
    },
    include: {
      workspace: {
        select: {
          name: true,
        },
      },
      _count: {
        select: {
          sources: { where: { deletedAt: null } },
        },
      },
      sources: {
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          fileName: true,
          fileType: true,
          status: true,
          duration: true,
          createdAt: true,
          updatedAt: true,
          processingStep: true,
          processingProgress: true,
          processingStartedAt: true,
          segments: {
            select: {
              highlights: {
                select: {
                  tag: {
                    select: {
                      id: true,
                      name: true,
                      color: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
      tags: {
        select: {
          id: true,
          name: true,
          color: true,
        },
        orderBy: { name: 'asc' },
      },
    },
  });

  if (!project) {
    notFound();
  }

  // Count total highlights for the project
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

  // Count trashed sources
  const trashedCount = await prisma.source.count({
    where: {
      projectId,
      deletedAt: { not: null },
    },
  });

  // Transform sources with aggregated tags
  const sourcesWithTags = project.sources.map((source) => {
    const tagMap = new Map<string, { id: string; name: string; color: string }>();
    let highlightCount = 0;

    for (const segment of source.segments) {
      for (const highlight of segment.highlights) {
        highlightCount++;
        if (!tagMap.has(highlight.tag.id)) {
          tagMap.set(highlight.tag.id, highlight.tag);
        }
      }
    }

    const { segments, ...sourceData } = source;

    return {
      ...sourceData,
      tags: Array.from(tagMap.values()),
      highlightCount,
      segmentsCount: segments.length,
      createdAt: source.createdAt.toISOString(),
      updatedAt: source.updatedAt.toISOString(),
      processingStartedAt: source.processingStartedAt?.toISOString() ?? null,
    };
  });

  return (
    <div className="space-y-8 px-8">
      {/* Project Header */}
      <ProjectHeader
        projectId={projectId}
        projectName={project.name}
        description={project.description}
        workspaceName={project.workspace.name}
        sourcesCount={project._count.sources}
        highlightsCount={highlightsCount}
        updatedAt={project.updatedAt}
      />

      {/* Sources Section */}
      <SourcesSection
        projectId={projectId}
        initialSources={sourcesWithTags}
        initialTrashedCount={trashedCount}
        projectTags={project.tags}
      />
    </div>
  );
}
