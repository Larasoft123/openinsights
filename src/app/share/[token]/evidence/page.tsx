import { notFound } from 'next/navigation';
import {
  validateShareLinkTenant,
  getProjectForEvidencePage,
  getHighlightsForEvidencePage,
  countHighlightsInProject,
  DEFAULT_TENANT_SCHEMA,
} from '@/lib/db/tenant-queries';
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
  const schemaName = DEFAULT_TENANT_SCHEMA;

  // Validate the share link
  const shareLink = await validateShareLinkTenant(schemaName, token);

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

  // Fetch project data from tenant schema
  const project = await getProjectForEvidencePage(schemaName, projectId);

  if (!project) {
    notFound();
  }

  // Fetch highlights from tenant schema
  const highlights = await getHighlightsForEvidencePage(schemaName, projectId);

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
      id: h.source.id,
      title: h.source.title,
      fileUrl: h.source.fileUrl,
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
        sourcesCount={project.sourcesCount}
        highlightsCount={highlightsCount}
        updatedAt={project.updatedAt}
      />
      <EvidenceDashboard project={project} initialHighlights={transformedHighlights} />
    </SharedProjectWrapper>
  );
}

export async function generateMetadata({ params }: PageProps) {
  const { token } = await params;

  const shareLink = await validateShareLinkTenant(DEFAULT_TENANT_SCHEMA, token);

  if (!shareLink || !shareLink.includeEvidence) {
    return { title: 'Not Found' };
  }

  return {
    title: `Shared Evidence | ${shareLink.project.name} | OpenInsights`,
    description: `Shared evidence from ${shareLink.project.name}`,
  };
}
