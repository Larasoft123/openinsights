import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getSourceWithDetails } from '@/lib/db/tenant-queries';
import { AnalysisCanvas } from '@/components/analysis-canvas/analysis-canvas';

interface PageProps {
  params: Promise<{ sourceId: string }>;
  searchParams: Promise<{ t?: string }>;
}

/**
 * Analysis Canvas Page
 *
 * Server component that fetches source data and renders the Analysis Canvas.
 * Uses dynamic route /sources/[sourceId]
 */
export default async function SourcePage({ params, searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user?.currentSchemaName) {
    redirect('/login');
  }

  const { sourceId } = await params;
  const { t } = await searchParams;
  const schemaName = session.user.currentSchemaName;

  // Parse initial time from URL parameter (e.g., ?t=185.716)
  const initialTime = t ? parseFloat(t) : undefined;

  // Fetch source with segments and project tags from tenant schema
  const source = await getSourceWithDetails(schemaName, sourceId);

  if (!source) {
    notFound();
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

  // Source must have fileUrl to be viewable
  if (!source.fileUrl) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold">Source Not Ready</h1>
          <p className="text-muted-foreground mt-2">
            This source is still being processed. Please check back later.
          </p>
        </div>
      </div>
    );
  }

  // Use streaming endpoint to avoid CORS issues with MinIO
  const videoUrl = `/api/sources/${sourceId}/stream`;

  // Prepare source data with proper type casting for JSON fields
  const sourceData = {
    ...source,
    fileUrl: videoUrl,
    summary: source.summary as Parameters<typeof AnalysisCanvas>[0]['source']['summary'],
    summaryStatus: source.summaryStatus as 'PENDING' | 'GENERATING' | 'COMPLETED' | 'FAILED' | null,
  };

  return (
    <AnalysisCanvas
      source={sourceData}
      initialTime={initialTime}
      highlightsCount={highlightsCount}
      sourceTags={sourceTags}
    />
  );
}

/**
 * Generate metadata for the page
 */
export async function generateMetadata({ params }: PageProps) {
  const session = await auth();
  if (!session?.user?.currentSchemaName) {
    return { title: 'Source | OpenInsights' };
  }

  const { sourceId } = await params;
  const schemaName = session.user.currentSchemaName;

  const source = await getSourceWithDetails(schemaName, sourceId);

  if (!source) {
    return { title: 'Source Not Found' };
  }

  return {
    title: `${source.title} | ${source.project.name} | OpenInsights`,
    description: `Analysis canvas for ${source.title}`,
  };
}
