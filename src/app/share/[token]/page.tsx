import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { validateShareLink } from '@/lib/services/share.service';
import { ProjectHeader } from '@/components/projects/detail/project-header';
import { SourcesSection } from '@/components/sources/sources-section';
import { SharedProjectWrapper } from '@/components/share/shared-project-wrapper';
import { SharedSourceWrapper } from '@/components/share/shared-source-wrapper';
import { AnalysisCanvas } from '@/components/analysis-canvas/analysis-canvas';

interface SharePageProps {
  params: Promise<{ token: string }>;
}

export default async function SharePage({ params }: SharePageProps) {
  const { token } = await params;

  // Validate the share link
  const shareLink = await validateShareLink(token);

  if (!shareLink) {
    notFound();
  }

  const isSourceShare = shareLink.sourceId !== null;

  // Handle source shares
  if (isSourceShare) {
    // Fetch source data with the same structure as the regular source page
    const source = await prisma.source.findUnique({
      where: { id: shareLink.sourceId! },
      select: {
        id: true,
        title: true,
        fileUrl: true,
        duration: true,
        status: true,
        createdAt: true,
        summary: true,
        summaryStatus: true,
        summaryGeneratedAt: true,
        project: {
          select: {
            id: true,
            name: true,
            workspace: {
              select: {
                name: true,
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
        },
        segments: {
          select: {
            id: true,
            content: true,
            startTime: true,
            endTime: true,
            speakerId: true,
            highlights: {
              select: {
                id: true,
                selectedText: true,
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
          orderBy: { startTime: 'asc' },
        },
      },
    });

    if (!source || !source.fileUrl) {
      notFound();
    }

    // Calculate highlights count and unique tags from segments
    const tagMap = new Map<string, { id: string; name: string; color: string }>();
    let sourceHighlightsCount = 0;

    for (const segment of source.segments) {
      for (const highlight of segment.highlights) {
        sourceHighlightsCount++;
        if (!tagMap.has(highlight.tag.id)) {
          tagMap.set(highlight.tag.id, highlight.tag);
        }
      }
    }

    const sourceTags = Array.from(tagMap.values());

    // Use public streaming endpoint for shared sources
    const videoUrl = `/api/public/sources/${source.id}/stream?token=${token}`;

    // Prepare source data with proper type casting for JSON fields
    const sourceData = {
      ...source,
      fileUrl: videoUrl,
      summary: source.summary as Parameters<typeof AnalysisCanvas>[0]['source']['summary'],
    };

    return (
      <SharedSourceWrapper shareToken={token} basePath={`/share/${token}`}>
        <AnalysisCanvas
          source={sourceData}
          highlightsCount={sourceHighlightsCount}
          sourceTags={sourceTags}
        />
      </SharedSourceWrapper>
    );
  }

  // Handle project shares - fetch data for sources tab
  const project = await prisma.project.findUnique({
    where: { id: shareLink.project.id },
    select: {
      id: true,
      name: true,
      description: true,
      updatedAt: true,
      summary: true,
      summaryStatus: true,
      summaryGeneratedAt: true,
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
          projectId: shareLink.project.id,
          deletedAt: null,
        },
      },
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
    <SharedProjectWrapper
      shareToken={token}
      basePath={`/share/${token}`}
      includeEvidence={shareLink.includeEvidence}
      includeInsights={shareLink.includeInsights}
    >
      <ProjectHeader
        projectId={project.id}
        projectName={project.name}
        description={project.description}
        workspaceName="Shared Project"
        sourcesCount={project._count.sources}
        highlightsCount={highlightsCount}
        updatedAt={project.updatedAt}
        summary={project.summary as Parameters<typeof ProjectHeader>[0]['summary']}
        summaryStatus={project.summaryStatus}
        summaryGeneratedAt={project.summaryGeneratedAt}
      />
      <SourcesSection
        projectId={project.id}
        initialSources={sourcesWithTags}
        initialTrashedCount={0}
        projectTags={project.tags}
      />
    </SharedProjectWrapper>
  );
}
