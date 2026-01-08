import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
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
    },
  });

  if (!project) {
    notFound();
  }

  return <EvidenceDashboard project={project} />;
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
