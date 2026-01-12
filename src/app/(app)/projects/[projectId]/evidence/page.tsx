import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getProjectForEvidencePage } from '@/lib/db/tenant-queries';
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
  const session = await auth();

  if (!session?.user?.currentSchemaName) {
    redirect('/login');
  }

  const { projectId } = await params;
  const schemaName = session.user.currentSchemaName;

  // Fetch project data for evidence page
  const project = await getProjectForEvidencePage(schemaName, projectId);

  if (!project) {
    notFound();
  }

  return (
    <div className="space-y-8 px-8">
      <ProjectHeader
        projectId={projectId}
        projectName={project.name}
        description={project.description}
        workspaceName={project.workspace.name}
        sourcesCount={project.sourcesCount}
        highlightsCount={project.highlightsCount}
        updatedAt={project.updatedAt}
      />
      <EvidenceDashboard project={project} />
    </div>
  );
}

export async function generateMetadata({ params }: PageProps) {
  const session = await auth();

  if (!session?.user?.currentSchemaName) {
    return { title: 'Evidence | OpenInsights' };
  }

  const { projectId } = await params;
  const schemaName = session.user.currentSchemaName;

  const project = await getProjectForEvidencePage(schemaName, projectId);

  if (!project) {
    return { title: 'Project Not Found' };
  }

  return {
    title: `Evidence | ${project.name} | OpenInsights`,
    description: `Evidence dashboard for ${project.name}`,
  };
}
