import { notFound } from 'next/navigation';
import {
  validateShareLinkTenant,
  getProjectForShareInsights,
  listUnassignedHighlights,
  countHighlightsInProject,
  DEFAULT_TENANT_SCHEMA,
} from '@/lib/db/tenant-queries';
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
  const schemaName = DEFAULT_TENANT_SCHEMA;

  // Validate the share link
  const shareLink = await validateShareLinkTenant(schemaName, token);

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

  // Fetch project with themes from tenant schema
  const project = await getProjectForShareInsights(schemaName, projectId);

  if (!project) {
    notFound();
  }

  // Get unassigned highlights from tenant schema
  const unassignedHighlights = await listUnassignedHighlights(schemaName, projectId);

  // Calculate highlights count
  const highlightsCount = await countHighlightsInProject(schemaName, projectId);

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
        sourcesCount={project.sourcesCount}
        highlightsCount={highlightsCount}
        updatedAt={project.updatedAt}
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
    </SharedProjectWrapper>
  );
}

export async function generateMetadata({ params }: PageProps) {
  const { token } = await params;

  const shareLink = await validateShareLinkTenant(DEFAULT_TENANT_SCHEMA, token);

  if (!shareLink || !shareLink.includeInsights) {
    return { title: 'Not Found' };
  }

  return {
    title: `Shared Insights | ${shareLink.project.name} | OpenInsights`,
    description: `Shared insights from ${shareLink.project.name}`,
  };
}
