import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { ProjectHeader } from '@/components/projects/detail/project-header';
import { EvidenceDashboard } from '@/components/evidence/evidence-dashboard';

interface PageProps {
  params: Promise<{ projectId: string }>;
}

/**
 * Evidence Dashboard Page
 *
 * Displays all highlights across sources in a project.
 * Supports filtering by tag, source, and semantic search.
 */
export default async function EvidencePage({ params }: PageProps) {
  const { projectId } = await params;

  // Verify project exists and get basic info
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

  // Calculate highlights count across all sources
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

  return (
    <div className="space-y-8 px-8">
      <ProjectHeader
        projectId={projectId}
        projectName={project.name}
        description={project.description}
        workspaceName={project.workspace.name}
        sourcesCount={project._count.sources}
        highlightsCount={highlightsCount}
        updatedAt={project.updatedAt}
      />
      <EvidenceDashboard project={project} />
    </div>
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
    title: `Evidence | ${project.name} | OpenInsights`,
    description: `Evidence dashboard for ${project.name}`,
  };
}
