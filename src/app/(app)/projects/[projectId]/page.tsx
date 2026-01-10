import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ProjectHeroSection } from '@/components/projects/detail/project-hero-section';
import { ProjectPillNav } from '@/components/projects/detail/project-pill-nav';
import { SourcesGrid } from '@/components/sources/sources-grid';

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
          duration: true,
          status: true,
          createdAt: true,
          _count: {
            select: {
              segments: true,
            },
          },
        },
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

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <ProjectHeroSection
        name={project.name}
        description={project.description}
        thumbnailUrl={null} // TODO: Add thumbnailUrl to Project model
        sourcesCount={project._count.sources}
        highlightsCount={highlightsCount}
        updatedAt={project.updatedAt}
      />

      {/* Pill Navigation */}
      <ProjectPillNav projectId={projectId} />

      {/* Sources Grid */}
      <SourcesGrid
        sources={project.sources.map((source) => ({
          ...source,
          thumbnailUrl: null, // TODO: Add thumbnailUrl to Source model
        }))}
        projectId={projectId}
      />
    </div>
  );
}
