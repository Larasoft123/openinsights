'use client';

import { useVideoPlayerStore, selectShouldShowResumeButton } from '@/lib/stores/video-player-store';
import { Button } from '@/components/ui/button';
import { ArrowDown, Plus } from 'lucide-react';
import { VirtualizedTranscript } from './virtualized-transcript';
import { TranscriptSearch } from './transcript-search';
import { TranscriptSegmentData } from './transcript-segment';

interface TranscriptPanelProps {
  segments: TranscriptSegmentData[];
  onEditSegment?: (segment: TranscriptSegmentData) => void;
  onDeleteSegment?: (segment: TranscriptSegmentData) => void;
  onAddSegment?: () => void;
}

/**
 * TranscriptPanel Component
 *
 * Container for the transcript display with:
 * - Search input with result count
 * - Virtualized transcript list
 * - "Resume Auto-scroll" button (appears when user scrolls away)
 */
export function TranscriptPanel({
  segments,
  onEditSegment,
  onDeleteSegment,
  onAddSegment,
}: TranscriptPanelProps) {
  const filteredSegmentIds = useVideoPlayerStore((state) => state.filteredSegmentIds);
  const resumeAutoScroll = useVideoPlayerStore((state) => state.resumeAutoScroll);
  const shouldShowResumeButton = useVideoPlayerStore(selectShouldShowResumeButton);

  // Calculate filtered count for search results
  const filteredCount = filteredSegmentIds?.length ?? segments.length;
  const isFiltered = filteredSegmentIds !== null;

  return (
    <div className="bg-background flex h-full flex-col">
      {/* Header with search and add button */}
      <div className="shrink-0 border-b p-4">
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <TranscriptSearch segments={segments} />
          </div>
          {onAddSegment && (
            <Button variant="outline" size="sm" onClick={onAddSegment}>
              <Plus className="mr-1 size-4" />
              Add
            </Button>
          )}
        </div>

        {/* Search results count */}
        {isFiltered && (
          <p className="text-muted-foreground mt-2 text-xs">
            {filteredCount} of {segments.length} segments
          </p>
        )}
      </div>

      {/* Transcript list */}
      <div className="relative flex-1 overflow-hidden">
        <VirtualizedTranscript
          segments={segments}
          onEditSegment={onEditSegment}
          onDeleteSegment={onDeleteSegment}
        />

        {/* Resume Auto-scroll button - appears when user scrolls away */}
        {shouldShowResumeButton && (
          <div className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2">
            <Button onClick={resumeAutoScroll} size="sm" variant="secondary" className="shadow-lg">
              <ArrowDown className="mr-1 size-4" />
              Resume Auto-scroll
            </Button>
          </div>
        )}
      </div>

      {/* Empty state */}
      {segments.length === 0 && (
        <div className="text-muted-foreground flex flex-1 items-center justify-center">
          No transcript available
        </div>
      )}

      {/* No search results state */}
      {isFiltered && filteredCount === 0 && segments.length > 0 && (
        <div className="text-muted-foreground flex flex-1 items-center justify-center">
          No matching segments found
        </div>
      )}
    </div>
  );
}
