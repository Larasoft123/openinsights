import { notFound } from 'next/navigation';
import {
  validateShareLinkTenant,
  getSourceForShareView,
  getProjectForShareView,
  countHighlightsInProject,
  DEFAULT_TENANT_SCHEMA,
} from '@/lib/db/tenant-queries';
import { ProjectHeader } from '@/components/projects/detail/project-header';
import { SourcesSection } from '@/components/sources/sources-section';
import { SharedProjectWrapper } from '@/components/share/shared-project-wrapper';
import { SharedSourceWrapper } from '@/components/share/shared-source-wrapper';
import { AnalysisCanvas } from '@/components/analysis-canvas/analysis-canvas';

type ProcessingStatus = 'PENDING' | 'UPLOADING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
type SummaryStatus = 'PENDING' | 'GENERATING' | 'COMPLETED' | 'FAILED';

interface SharePageProps {
  params: Promise<{ token: string }>;
}

export default async function SharePage({ params }: SharePageProps) {
  const { token } = await params;
  const schemaName = DEFAULT_TENANT_SCHEMA;

  // Validate the share link
  const shareLink = await validateShareLinkTenant(schemaName, token);

  if (!shareLink) {
    notFound();
  }

  const isSourceShare = shareLink.sourceId !== null;

  // Handle source shares
  if (isSourceShare) {
    // Fetch source data from tenant schema
    const source = await getSourceForShareView(schemaName, shareLink.sourceId!);

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

    // Prepare source data with proper type casting
    const sourceData = {
      ...source,
      fileUrl: videoUrl,
      status: source.status as ProcessingStatus,
      summaryStatus: source.summaryStatus as SummaryStatus | null,
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

  // Handle project shares - fetch data from tenant schema
  const project = await getProjectForShareView(schemaName, shareLink.project.id);

  if (!project) {
    notFound();
  }

  // Count total highlights for the project
  const highlightsCount = await countHighlightsInProject(schemaName, shareLink.project.id);

  // Transform sources for component compatibility with proper type casting
  // Use public thumbnail proxy endpoint for shared sources
  const sourcesWithTags = project.sources.map((source) => ({
    ...source,
    // Use public proxy endpoint with share token to avoid CORS/private IP issues
    thumbnailUrl: source.thumbnailUrl
      ? `/api/public/sources/${source.id}/thumbnail?token=${token}`
      : null,
    status: source.status as ProcessingStatus,
    createdAt: source.createdAt.toISOString(),
    updatedAt: source.updatedAt.toISOString(),
    processingStartedAt: source.processingStartedAt?.toISOString() ?? null,
  }));

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
        language={project.language || 'en'}
        workspaceName="Shared Project"
        sourcesCount={project.sourcesCount}
        highlightsCount={highlightsCount}
        updatedAt={project.updatedAt}
        summary={project.summary as Parameters<typeof ProjectHeader>[0]['summary']}
        summaryStatus={project.summaryStatus as SummaryStatus | null}
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
