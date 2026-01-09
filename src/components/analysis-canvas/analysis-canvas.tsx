'use client';

import { useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { VideoPlayer, KeyboardShortcuts, SourceTags } from './video-player';
import { TranscriptPanel, QuickTagPopover, TagData, TranscriptSegmentData } from './transcript';
import { useTextSelection } from './hooks';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import Link from 'next/link';

interface SourceData {
  id: string;
  title: string;
  fileUrl: string;
  duration: number | null;
  project: {
    id: string;
    name: string;
    tags: TagData[];
  };
  segments: TranscriptSegmentData[];
}

interface AnalysisCanvasProps {
  source: SourceData;
  onHighlightCreated?: () => void;
}

/**
 * AnalysisCanvas Component
 *
 * Main layout for the Analysis Canvas - where researchers spend 90% of their time.
 *
 * Features:
 * - 2-column responsive layout (Video | Transcript)
 * - Sticky video player
 * - Synchronized video-transcript playback
 * - Keyboard shortcuts for navigation
 * - Quick Tag popover on text selection
 * - Auto-scrolling transcript with user-interruption detection
 */
export function AnalysisCanvas({ source, onHighlightCreated }: AnalysisCanvasProps) {
  const router = useRouter();
  const transcriptContainerRef = useRef<HTMLDivElement>(null);
  const { selection, clearSelection } = useTextSelection(transcriptContainerRef);

  // Handle highlight creation - refresh server data to update UI
  const handleTagCreated = useCallback(() => {
    // Trigger Next.js server refetch to update segments with new highlights
    router.refresh();
    onHighlightCreated?.();
  }, [router, onHighlightCreated]);

  return (
    <div className="flex h-screen flex-col">
      {/* Header with breadcrumbs */}
      <header className="bg-background shrink-0 border-b px-6 py-3">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/projects">Projects</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href={`/projects/${source.project.id}`}>{source.project.name}</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="max-w-xs truncate">{source.title}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>

      {/* Main content - 2 column layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left column - Video Player (sticky) */}
        <div className="w-1/2 shrink-0 border-r">
          <div className="sticky top-0 flex h-full flex-col gap-4 p-4">
            <VideoPlayer src={source.fileUrl} />
            <div className="border-t pt-4">
              <h3 className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
                Tags in this source
              </h3>
              <SourceTags segments={source.segments} />
            </div>
          </div>
        </div>

        {/* Right column - Transcript Panel */}
        <div ref={transcriptContainerRef} className="flex w-1/2 flex-col overflow-hidden">
          <TranscriptPanel segments={source.segments} />
        </div>
      </div>

      {/* Quick Tag Popover - appears on text selection */}
      <QuickTagPopover
        selection={selection}
        tags={source.project.tags}
        sourceId={source.id}
        projectId={source.project.id}
        onTagCreated={handleTagCreated}
        onClose={clearSelection}
      />

      {/* Keyboard shortcuts handler (invisible) */}
      <KeyboardShortcuts />
    </div>
  );
}
