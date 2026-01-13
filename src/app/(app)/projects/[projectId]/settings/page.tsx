import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { withTenantSchema } from '@/lib/db/tenant';
import { getProjectById } from '@/lib/db/tenant-queries';
import { ProjectHeader } from '@/components/projects/detail/project-header';
import { ProjectSettingsForm } from '@/components/projects/settings/project-settings-form';

interface PageProps {
  params: Promise<{ projectId: string }>;
}

/**
 * Project Settings Page
 *
 * Full-page settings for project configuration including
 * basic info, research setup, and project management fields.
 */
export default async function ProjectSettingsPage({ params }: PageProps) {
  const session = await auth();

  if (!session?.user?.currentSchemaName) {
    redirect('/login');
  }

  const { projectId } = await params;
  const schemaName = session.user.currentSchemaName;

  // Fetch project data
  const project = await getProjectById(schemaName, projectId);

  if (!project) {
    notFound();
  }

  // Get workspace info for the project
  const workspace = await withTenantSchema(schemaName, async (client) => {
    const result = await client.query(
      `SELECT w.id, w.name FROM workspaces w
       JOIN projects p ON p.workspace_id = w.id
       WHERE p.id = $1`,
      [projectId]
    );
    return result.rows[0] ?? { id: '', name: 'Unknown' };
  });

  // Count total highlights for the project
  const highlightsCount = await withTenantSchema(schemaName, async (client) => {
    const result = await client.query(
      `SELECT COUNT(*) as count
       FROM highlights h
       JOIN transcript_segments ts ON ts.id = h.segment_id
       JOIN sources s ON s.id = ts.source_id
       WHERE s.project_id = $1 AND s.deleted_at IS NULL`,
      [projectId]
    );
    return parseInt(result.rows[0]?.count ?? '0', 10);
  });

  return (
    <div className="space-y-8 px-8">
      {/* Project Header */}
      <ProjectHeader
        projectId={projectId}
        projectName={project.name}
        description={project.description}
        language={project.language}
        workspaceName={workspace.name}
        sourcesCount={project._count?.sources ?? 0}
        highlightsCount={highlightsCount}
        updatedAt={project.updatedAt}
        archivedAt={project.archivedAt}
        summary={project.summary as Parameters<typeof ProjectHeader>[0]['summary']}
        summaryStatus={
          project.summaryStatus as 'PENDING' | 'GENERATING' | 'COMPLETED' | 'FAILED' | null
        }
        summaryGeneratedAt={project.summaryGeneratedAt}
        // Project Settings
        projectType={project.projectType}
        goals={project.goals}
        context={project.context}
        deadline={project.deadline}
        stakeholder={project.stakeholder}
        researchQuestions={project.researchQuestions}
        targetParticipants={project.targetParticipants}
        recruitmentCriteria={project.recruitmentCriteria}
      />

      {/* Project Settings Form */}
      <ProjectSettingsForm
        projectId={projectId}
        workspaceId={workspace.id}
        initialData={{
          name: project.name,
          description: project.description,
          language: project.language,
          projectType: project.projectType,
          goals: project.goals,
          context: project.context,
          deadline: project.deadline,
          stakeholder: project.stakeholder,
          researchQuestions: project.researchQuestions,
          targetParticipants: project.targetParticipants,
          recruitmentCriteria: project.recruitmentCriteria,
        }}
      />
    </div>
  );
}

export async function generateMetadata({ params }: PageProps) {
  const session = await auth();

  if (!session?.user?.currentSchemaName) {
    return { title: 'Settings | OpenInsights' };
  }

  const { projectId } = await params;
  const schemaName = session.user.currentSchemaName;

  const project = await getProjectById(schemaName, projectId);

  if (!project) {
    return { title: 'Project Not Found' };
  }

  return {
    title: `Settings | ${project.name} | OpenInsights`,
    description: `Project settings for ${project.name}`,
  };
}
