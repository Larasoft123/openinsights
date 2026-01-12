import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { withTenantSchema } from '@/lib/db/tenant';
import { getProjectById, listSourcesWithTags, listTags } from '@/lib/db/tenant-queries';
import { ProjectHeader } from '@/components/projects/detail/project-header';
import { SourcesSection } from '@/components/sources/sources-section';

interface ProjectPageProps {
  params: Promise<{ projectId: string }>;
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { projectId } = await params;
  const session = await auth();

  if (!session?.user?.currentSchemaName) {
    redirect('/login');
  }

  const schemaName = session.user.currentSchemaName;

  // Fetch project, sources with tags, and project tags in parallel
  const [project, sourcesData, tags] = await Promise.all([
    getProjectById(schemaName, projectId),
    listSourcesWithTags(schemaName, projectId),
    listTags(schemaName, projectId),
  ]);

  if (!project) {
    notFound();
  }

  // Get workspace name for the project
  const workspace = await withTenantSchema(schemaName, async (client) => {
    const result = await client.query(
      `SELECT w.name FROM workspaces w
       JOIN projects p ON p.workspace_id = w.id
       WHERE p.id = $1`,
      [projectId]
    );
    return result.rows[0] ?? { name: 'Unknown' };
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

  const { sources, trashedCount } = sourcesData;

  type ProcessingStatus = 'PENDING' | 'UPLOADING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

  // Transform sources for the component
  const sourcesWithTags = sources.map((source) => ({
    id: source.id,
    title: source.title,
    fileName: source.fileName,
    fileType: source.fileType,
    status: source.status as ProcessingStatus,
    duration: source.duration,
    processingStep: source.processingStep,
    processingProgress: source.processingProgress,
    processingStartedAt: source.processingStartedAt?.toISOString() ?? null,
    createdAt: source.createdAt.toISOString(),
    updatedAt: source.updatedAt.toISOString(),
    tags: source.tags,
    highlightCount: source.highlightCount,
    segmentsCount: source.segmentsCount,
  }));

  return (
    <div className="space-y-8 px-8">
      {/* Project Header */}
      <ProjectHeader
        projectId={projectId}
        projectName={project.name}
        description={project.description}
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
      />

      {/* Sources Section */}
      <SourcesSection
        projectId={projectId}
        initialSources={sourcesWithTags}
        initialTrashedCount={trashedCount}
        projectTags={tags.map((t) => ({ id: t.id, name: t.name, color: t.color }))}
      />
    </div>
  );
}
