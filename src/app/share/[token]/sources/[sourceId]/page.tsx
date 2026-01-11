import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { validateShareLink } from '@/lib/services/share.service';
import { AnalysisCanvas } from '@/components/analysis-canvas/analysis-canvas';
import { SharedSourceWrapper } from '@/components/share/shared-source-wrapper';

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

  // Parse initial time from URL parameter (e.g., ?t=185.716)
  const initialTime = t ? parseFloat(t) : undefined;

  // Validate the share link
  const shareLink = await validateShareLink(token);

  if (!shareLink) {
    notFound();
  }

  // Source shares should not access this page - they go directly to /share/[token]
  if (shareLink.sourceId !== null) {
    notFound();
  }

  // Verify the source belongs to the shared project
  const source = await prisma.source.findUnique({
    where: { id: sourceId },
    select: {
      id: true,
      title: true,
      fileUrl: true,
      duration: true,
      status: true,
      createdAt: true,
      summary: true,
      summaryStatus: true,
      summaryGeneratedAt: true,
      projectId: true,
      project: {
        select: {
          id: true,
          name: true,
          workspace: {
            select: {
              name: true,
            },
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
      },
      segments: {
        select: {
          id: true,
          content: true,
          startTime: true,
          endTime: true,
          speakerId: true,
          highlights: {
            select: {
              id: true,
              selectedText: true,
              tag: {
                select: {
                  id: true,
                  name: true,
                  color: true,
                },
              },
            },
          },
        },
        orderBy: { startTime: 'asc' },
      },
    },
  });

  if (!source) {
    notFound();
  }

  // Verify source belongs to the shared project
  if (source.projectId !== shareLink.project.id) {
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

  // Prepare source data with proper type casting for JSON fields
  const sourceData = {
    ...source,
    fileUrl: videoUrl,
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

  const shareLink = await validateShareLink(token);

  if (!shareLink) {
    return { title: 'Not Found' };
  }

  const source = await prisma.source.findUnique({
    where: { id: sourceId },
    select: {
      title: true,
      projectId: true,
    },
  });

  if (!source || source.projectId !== shareLink.project.id) {
    return { title: 'Not Found' };
  }

  return {
    title: `${source.title} | Shared | OpenInsights`,
    description: `Shared source from ${shareLink.project.name}`,
  };
}
