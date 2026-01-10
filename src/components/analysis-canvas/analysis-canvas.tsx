'use client';

import { useRef, useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { VideoPlayer, KeyboardShortcuts, SourceTags } from './video-player';
import { TranscriptPanel, QuickTagPopover, TagData, TranscriptSegmentData } from './transcript';
import { SpeakerNamesProvider } from './transcript/speaker-names-context';
import { SegmentEditDialog } from './transcript/segment-edit-dialog';
import { SegmentDeleteDialog } from './transcript/segment-delete-dialog';
import { SegmentCreateDialog } from './transcript/segment-create-dialog';
import { useTextSelection } from './hooks';
import { SourceHeader } from '@/components/sources/detail/source-header';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';

interface SourceData {
  id: string;
  title: string;
  fileUrl: string;
  duration: number | null;
  createdAt: Date;
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
  highlightsCount,
  sourceTags,
  onHighlightCreated,
}: AnalysisCanvasProps) {
  const router = useRouter();
  const transcriptContainerRef = useRef<HTMLDivElement>(null);
  const { selection, clearSelection } = useTextSelection(transcriptContainerRef);

  // Segment CRUD state
  const [editingSegment, setEditingSegment] = useState<TranscriptSegmentData | null>(null);
  const [deletingSegment, setDeletingSegment] = useState<TranscriptSegmentData | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

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
    <SpeakerNamesProvider projectId={source.project.id}>
      <div className="flex h-screen flex-col bg-gray-950">
        {/* Source Header */}
        <div className="shrink-0 px-8 pt-8">
          <SourceHeader
            sourceId={source.id}
            sourceTitle={source.title}
            projectId={source.project.id}
            projectName={source.project.name}
            workspaceName={source.project.workspace.name}
            duration={source.duration}
            segmentsCount={source.segments.length}
            highlightsCount={highlightsCount}
            createdAt={source.createdAt}
          />
        </div>

        {/* Main content - 2 column resizable layout */}
        <div className="flex-1 overflow-hidden px-8 pt-8 pb-8">
          <ResizablePanelGroup direction="horizontal" className="h-full gap-8">
            {/* Left panel - Video Player */}
            <ResizablePanel defaultSize={50} minSize={25}>
              <div className="flex h-full flex-col gap-4 overflow-auto rounded-2xl border border-gray-800 bg-gray-900 p-4">
                <VideoPlayer src={source.fileUrl} initialTime={initialTime} />
                <div className="border-t border-gray-800 pt-4">
                  <h3 className="mb-2 text-xs font-medium tracking-wide text-gray-400 uppercase">
                    Tags in this source
                  </h3>
                  <SourceTags segments={source.segments} />
                </div>
              </div>
            </ResizablePanel>

            <ResizableHandle withHandle />

            {/* Right panel - Transcript */}
            <ResizablePanel defaultSize={50} minSize={25}>
              <div
                ref={transcriptContainerRef}
                className="flex h-full flex-col overflow-hidden rounded-2xl border border-gray-800 bg-gray-900"
              >
                <TranscriptPanel
                  segments={source.segments}
                  sourceId={source.id}
                  onEditSegment={setEditingSegment}
                  onDeleteSegment={setDeletingSegment}
                  onAddSegment={() => setIsCreateDialogOpen(true)}
                  onSpeakerChanged={handleSegmentMutated}
                />
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
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

        {/* Segment CRUD Dialogs */}
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

        <SegmentCreateDialog
          open={isCreateDialogOpen}
          sourceId={source.id}
          onClose={() => setIsCreateDialogOpen(false)}
          onCreated={handleSegmentMutated}
        />
      </div>
    </SpeakerNamesProvider>
  );
}
