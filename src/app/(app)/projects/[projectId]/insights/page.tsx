import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getProjectForInsightsPage, listUnassignedHighlights } from '@/lib/db/tenant-queries';
import { ProjectHeader } from '@/components/projects/detail/project-header';
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
  const session = await auth();

  if (!session?.user?.currentSchemaName) {
    redirect('/login');
  }

  const { projectId } = await params;
  const schemaName = session.user.currentSchemaName;

  // Fetch project data and unassigned highlights in parallel
  const [project, unassignedHighlights] = await Promise.all([
    getProjectForInsightsPage(schemaName, projectId),
    listUnassignedHighlights(schemaName, projectId),
  ]);

  if (!project) {
    notFound();
  }

  return (
    <div className="space-y-8 px-8">
      <ProjectHeader
        projectId={projectId}
        projectName={project.name}
        description={project.description}
        language={project.language}
        workspaceName={project.workspace.name}
        sourcesCount={project.sourcesCount}
        highlightsCount={project.highlightsCount}
        updatedAt={project.updatedAt}
        archivedAt={project.archivedAt}
      />
      <InsightBoard
        project={{
          id: project.id,
          name: project.name,
          workspace: project.workspace,
        }}
        themes={project.themes}
        unassignedHighlights={unassignedHighlights}
      />
    </div>
  );
}

export async function generateMetadata({ params }: PageProps) {
  const session = await auth();

  if (!session?.user?.currentSchemaName) {
    return { title: 'Insights | OpenInsights' };
  }

  const { projectId } = await params;
  const schemaName = session.user.currentSchemaName;

  const project = await getProjectForInsightsPage(schemaName, projectId);

  if (!project) {
    return { title: 'Project Not Found' };
  }

  return {
    title: `Insights | ${project.name} | OpenInsights`,
    description: `Insight board for ${project.name}`,
  };
}
