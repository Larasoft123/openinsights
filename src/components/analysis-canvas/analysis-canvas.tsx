'use client';

import { useRef, useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { VideoPlayer, KeyboardShortcuts } from './video-player';
import { TranscriptPanel, QuickTagPopover, TagData, TranscriptSegmentData } from './transcript';
import { SpeakerNamesProvider } from './transcript/speaker-names-context';
import { SourceSummary } from './summary';
import { SegmentEditDialog } from './transcript/segment-edit-dialog';
import { SegmentDeleteDialog } from './transcript/segment-delete-dialog';
import { useTextSelection } from './hooks';
import { SourceHeader } from '@/components/sources/detail/source-header';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { useShareContext } from '@/lib/contexts/read-only-context';

interface SourceSummaryData {
  narrative?: string;
  duration?: number;
  segmentCount?: number;
  // Legacy format fields (for backwards compatibility)
  keyTopics?: string[];
  keyQuotes?: { quote: string; speaker?: string }[];
  participants?: { id?: string; role?: string }[];
}

interface SourceData {
  id: string;
  title: string;
  fileUrl: string;
  duration: number | null;
  createdAt: Date;
  summary?: SourceSummaryData | null;
  summaryStatus?: 'PENDING' | 'GENERATING' | 'COMPLETED' | 'FAILED' | null;
  summaryGeneratedAt?: Date | string | null;
  project: {
    id: string;
    name: string;
    workspace: {
      name: string;
    };
    tags: TagData[];
  };
  segments: TranscriptSegmentData[];
}

interface AnalysisCanvasProps {
  source: SourceData;
  initialTime?: number;
  highlightsCount: number;
  sourceTags: TagData[];
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
export function AnalysisCanvas({
  source,
  initialTime,
  highlightsCount: _highlightsCount,
  sourceTags: _sourceTags,
  onHighlightCreated,
}: AnalysisCanvasProps) {
  void _sourceTags; // Reserved for future use
  void _highlightsCount; // Reserved for future use
  const router = useRouter();
  const { canEdit, shareToken } = useShareContext();
  const transcriptContainerRef = useRef<HTMLDivElement>(null);

  // Text selection for Quick Tag (only enabled in edit mode)
  const { selection, clearSelection } = useTextSelection(transcriptContainerRef, !canEdit);

  // Segment CRUD state (only used in edit mode)
  const [editingSegment, setEditingSegment] = useState<TranscriptSegmentData | null>(null);
  const [deletingSegment, setDeletingSegment] = useState<TranscriptSegmentData | null>(null);

  // Handle highlight creation - refresh server data to update UI
  const handleTagCreated = useCallback(() => {
    // Trigger Next.js server refetch to update segments with new highlights
    router.refresh();
    onHighlightCreated?.();
  }, [router, onHighlightCreated]);

  // Handle segment mutations - refresh server data
  const handleSegmentMutated = useCallback(() => {
    router.refresh();
  }, [router]);

  return (
    <SpeakerNamesProvider projectId={source.project.id} shareToken={shareToken}>
      <div className="min-h-screen space-y-8 bg-gray-950 px-8 pb-8">
        {/* Source Header */}
        <div>
          <SourceHeader
            sourceId={source.id}
            sourceTitle={source.title}
            projectId={source.project.id}
            projectName={source.project.name}
            workspaceName={source.project.workspace.name}
          />
        </div>

        {/* Main content - 2 column resizable layout where right matches left height */}
        <ResizablePanelGroup direction="horizontal" className="flex gap-8">
          {/* Left panel - Video Player + AI Summary (no scroll, expands naturally) */}
          <ResizablePanel defaultSize={50} minSize={25} className="!overflow-visible">
            <div className="flex h-full flex-col gap-8">
              {/* Video Player Card */}
              <div className="rounded-2xl border border-gray-800 bg-gray-900 p-4">
                <VideoPlayer src={source.fileUrl} initialTime={initialTime} />
              </div>

              {/* AI Summary Card - Separate from video player */}
              <div className="rounded-2xl border border-gray-800 bg-gray-900 p-4">
                <SourceSummary
                  sourceId={source.id}
                  initialSummary={source.summary}
                  initialStatus={source.summaryStatus}
                  initialGeneratedAt={source.summaryGeneratedAt}
                />
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle className="mx-4" />

          {/* Right panel - Transcript (matches left height, scrolls internally) */}
          <ResizablePanel defaultSize={50} minSize={25}>
            <div
              ref={transcriptContainerRef}
              className="flex h-full flex-col overflow-hidden rounded-2xl border border-gray-800 bg-gray-900"
            >
              <TranscriptPanel
                segments={source.segments}
                sourceId={source.id}
                onEditSegment={canEdit ? setEditingSegment : undefined}
                onDeleteSegment={canEdit ? setDeletingSegment : undefined}
                onSpeakerChanged={canEdit ? handleSegmentMutated : undefined}
                readOnly={!canEdit}
              />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>

        {/* Quick Tag Popover - appears on text selection (only in edit mode) */}
        {canEdit && (
          <QuickTagPopover
            selection={selection}
            tags={source.project.tags}
            sourceId={source.id}
            projectId={source.project.id}
            onTagCreated={handleTagCreated}
            onClose={clearSelection}
          />
        )}

        {/* Keyboard shortcuts handler (invisible) */}
        <KeyboardShortcuts />

        {/* Segment CRUD Dialogs (only in edit mode) */}
        {canEdit && (
          <>
            <SegmentEditDialog
              segment={editingSegment}
              sourceId={source.id}
              allSegments={source.segments}
              onClose={() => setEditingSegment(null)}
              onSaved={handleSegmentMutated}
            />

            <SegmentDeleteDialog
              segment={deletingSegment}
              sourceId={source.id}
              onClose={() => setDeletingSegment(null)}
              onDeleted={handleSegmentMutated}
            />
          </>
        )}
      </div>
    </SpeakerNamesProvider>
  );
}
