import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { validateShareLink } from '@/lib/services/share.service';
import { ProjectHeader } from '@/components/projects/detail/project-header';
import { EvidenceDashboard } from '@/components/evidence/evidence-dashboard';
import { SharedProjectWrapper } from '@/components/share/shared-project-wrapper';

interface PageProps {
  params: Promise<{ token: string }>;
}

/**
 * Shared Evidence Dashboard Page
 *
 * Displays all highlights across sources in a shared project.
 */
export default async function SharedEvidencePage({ params }: PageProps) {
  const { token } = await params;

  // Validate the share link
  const shareLink = await validateShareLink(token);

  if (!shareLink) {
    notFound();
  }

  // Check if evidence is included in this share
  if (!shareLink.includeEvidence) {
    notFound();
  }

  // Source shares don't have evidence page
  if (shareLink.sourceId !== null) {
    notFound();
  }

  const projectId = shareLink.project.id;

  // Fetch project data for evidence dashboard
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
      sources: {
        select: {
          id: true,
          title: true,
        },
        where: { deletedAt: null },
        orderBy: { title: 'asc' },
      },
      tags: {
        select: {
          id: true,
          name: true,
          color: true,
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

  // Fetch highlights for the shared view (server-side)
  const highlights = await prisma.highlight.findMany({
    where: {
      segment: {
        source: {
          projectId,
          deletedAt: null,
        },
      },
    },
    select: {
      id: true,
      note: true,
      selectedText: true,
      createdAt: true,
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
    orderBy: { createdAt: 'desc' },
  });

  // Transform highlights to match the expected format
  const transformedHighlights = highlights.map((h) => ({
    id: h.id,
    note: h.note,
    selectedText: h.selectedText,
    createdAt: h.createdAt.toISOString(),
    tag: h.tag,
    segment: {
      id: h.segment.id,
      content: h.segment.content,
      startTime: h.segment.startTime,
      endTime: h.segment.endTime,
      speakerId: h.segment.speakerId,
    },
    source: {
      id: h.segment.source.id,
      title: h.segment.source.title,
      fileUrl: h.segment.source.fileUrl,
    },
  }));

  const highlightsCount = highlights.length;

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
      <EvidenceDashboard project={project} initialHighlights={transformedHighlights} />
    </SharedProjectWrapper>
  );
}

export async function generateMetadata({ params }: PageProps) {
  const { token } = await params;

  const shareLink = await validateShareLink(token);

  if (!shareLink || !shareLink.includeEvidence) {
    return { title: 'Not Found' };
  }

  return {
    title: `Shared Evidence | ${shareLink.project.name} | OpenInsights`,
    description: `Shared evidence from ${shareLink.project.name}`,
  };
}
