import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
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
  const { sourceId } = await params;
  const { t } = await searchParams;

  // Parse initial time from URL parameter (e.g., ?t=185.716)
  const initialTime = t ? parseFloat(t) : undefined;

  // Fetch source with segments and project tags
  const source = await prisma.source.findUnique({
    where: { id: sourceId },
    select: {
      id: true,
      title: true,
      fileUrl: true,
      duration: true,
      status: true,
      project: {
        select: {
          id: true,
          name: true,
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

  return <AnalysisCanvas source={{ ...source, fileUrl: videoUrl }} initialTime={initialTime} />;
}

/**
 * Generate metadata for the page
 */
export async function generateMetadata({ params }: PageProps) {
  const { sourceId } = await params;

  const source = await prisma.source.findUnique({
    where: { id: sourceId },
    select: {
      title: true,
      project: { select: { name: true } },
    },
  });

  if (!source) {
    return { title: 'Source Not Found' };
  }

  return {
    title: `${source.title} | ${source.project.name} | OpenInsights`,
    description: `Analysis canvas for ${source.title}`,
  };
}
