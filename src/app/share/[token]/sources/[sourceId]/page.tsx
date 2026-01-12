import { notFound } from 'next/navigation';
import {
  validateShareLinkTenant,
  getSourceForShareView,
  getSourceById,
  DEFAULT_TENANT_SCHEMA,
} from '@/lib/db/tenant-queries';
import { AnalysisCanvas } from '@/components/analysis-canvas/analysis-canvas';
import { SharedSourceWrapper } from '@/components/share/shared-source-wrapper';

type ProcessingStatus = 'PENDING' | 'UPLOADING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
type SummaryStatus = 'PENDING' | 'GENERATING' | 'COMPLETED' | 'FAILED';

interface PageProps {
  params: Promise<{ token: string; sourceId: string }>;
  searchParams: Promise<{ t?: string }>;
}

/**
 * Shared Source Analysis Canvas Page
 *
 * Read-only view of a source within a shared project.
 * Uses the same AnalysisCanvas component but wrapped with ShareProvider.
 */
export default async function SharedSourcePage({ params, searchParams }: PageProps) {
  const { token, sourceId } = await params;
  const { t } = await searchParams;
  const schemaName = DEFAULT_TENANT_SCHEMA;

  // Parse initial time from URL parameter (e.g., ?t=185.716)
  const initialTime = t ? parseFloat(t) : undefined;

  // Validate the share link
  const shareLink = await validateShareLinkTenant(schemaName, token);

  if (!shareLink) {
    notFound();
  }

  // Source shares should not access this page - they go directly to /share/[token]
  if (shareLink.sourceId !== null) {
    notFound();
  }

  // Fetch source data from tenant schema
  const source = await getSourceForShareView(schemaName, sourceId);

  if (!source) {
    notFound();
  }

  // Verify source belongs to the shared project
  if (source.project.id !== shareLink.project.id) {
    notFound();
  }

  // Source must have fileUrl to be viewable
  if (!source.fileUrl) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-950">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-white">Source Not Ready</h1>
          <p className="mt-2 text-gray-400">
            This source is still being processed. Please check back later.
          </p>
        </div>
      </div>
    );
  }

  // Calculate highlights count and unique tags from segments
  const tagMap = new Map<string, { id: string; name: string; color: string }>();
  let highlightsCount = 0;

  for (const segment of source.segments) {
    for (const highlight of segment.highlights) {
      highlightsCount++;
      if (!tagMap.has(highlight.tag.id)) {
        tagMap.set(highlight.tag.id, highlight.tag);
      }
    }
  }

  const sourceTags = Array.from(tagMap.values());

  // Use public streaming endpoint for shared sources
  const videoUrl = `/api/public/sources/${sourceId}/stream?token=${token}`;

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
        initialTime={initialTime}
        highlightsCount={highlightsCount}
        sourceTags={sourceTags}
      />
    </SharedSourceWrapper>
  );
}

export async function generateMetadata({ params }: PageProps) {
  const { token, sourceId } = await params;
  const schemaName = DEFAULT_TENANT_SCHEMA;

  const shareLink = await validateShareLinkTenant(schemaName, token);

  if (!shareLink) {
    return { title: 'Not Found' };
  }

  const source = await getSourceById(schemaName, sourceId);

  if (!source || source.projectId !== shareLink.project.id) {
    return { title: 'Not Found' };
  }

  return {
    title: `${source.title} | Shared | OpenInsights`,
    description: `Shared source from ${shareLink.project.name}`,
  };
}
