'use client';

import { useState, useMemo } from 'react';
import { useVideoPlayerStore, selectShouldShowResumeButton } from '@/lib/stores/video-player-store';
import { Button } from '@/components/ui/button';
import { ArrowDown } from 'lucide-react';
import { VirtualizedTranscript } from './virtualized-transcript';
import { TranscriptSearch } from './transcript-search';
import { SpeakerFilter } from './speaker-filter';
import { TagFilter } from './tag-filter';
import { TranscriptSegmentData } from './transcript-segment';
import { getUniqueSpeakers } from '@/lib/utils/speaker-colors';

interface TranscriptPanelProps {
  segments: TranscriptSegmentData[];
  sourceId: string;
  onEditSegment?: (segment: TranscriptSegmentData) => void;
  onDeleteSegment?: (segment: TranscriptSegmentData) => void;
  onSpeakerChanged?: () => void;
  readOnly?: boolean;
}

/**
 * TranscriptPanel Component
 *
 * Container for the transcript display with:
 * - Search input with result count
 * - Virtualized transcript list
 * - "Resume Auto-scroll" button (appears when user scrolls away)
 * - Tag filter (shows only segments with highlights of selected tag)
 */
export function TranscriptPanel({
  segments,
  sourceId,
  onEditSegment,
  onDeleteSegment,
  onSpeakerChanged,
  readOnly = false,
}: TranscriptPanelProps) {
  const filteredSegmentIds = useVideoPlayerStore((state) => state.filteredSegmentIds);
  const resumeAutoScroll = useVideoPlayerStore((state) => state.resumeAutoScroll);
  const shouldShowResumeButton = useVideoPlayerStore(selectShouldShowResumeButton);

  // Speaker filter state (null = all speakers)
  const [selectedSpeakers, setSelectedSpeakers] = useState<Set<string> | null>(null);

  // Tag filter state (null = all tags, no filter)
  const [activeTagFilter, setActiveTagFilter] = useState<string | null>(null);

  // Check if source has diarization data
  const hasSpeakers = useMemo(() => getUniqueSpeakers(segments).length > 0, [segments]);

  // Filter segments by speaker selection
  const speakerFilteredSegments = useMemo(() => {
    if (selectedSpeakers === null) return segments;
    return segments.filter((s) => s.speakerId === null || selectedSpeakers.has(s.speakerId));
  }, [segments, selectedSpeakers]);

  // Filter segments by tag (show only segments with highlights of selected tag)
  const tagFilteredSegments = useMemo(() => {
    if (!activeTagFilter) return speakerFilteredSegments;
    return speakerFilteredSegments.filter((s) =>
      s.highlights?.some((h) => h.tag.id === activeTagFilter)
    );
  }, [speakerFilteredSegments, activeTagFilter]);

  // Calculate filtered count for search results
  const searchFilteredCount = filteredSegmentIds?.length ?? tagFilteredSegments.length;
  const isSearchFiltered = filteredSegmentIds !== null;
  const isSpeakerFiltered = selectedSpeakers !== null;
  const isTagFiltered = activeTagFilter !== null && activeTagFilter !== undefined;

  return (
    <div className="flex h-full flex-col">
      {/* Header with search and filters on one line */}
      <div className="border-border shrink-0 border-b p-4">
        <div className="flex items-center gap-2">
          {/* Search input */}
          <div className="flex-1">
            <TranscriptSearch segments={segments} />
          </div>

          {/* Filter pills */}
          {hasSpeakers && (
            <SpeakerFilter
              segments={segments}
              selectedSpeakers={selectedSpeakers}
              onSelectionChange={setSelectedSpeakers}
            />
          )}
          <TagFilter
            segments={segments}
            selectedTagId={activeTagFilter}
            onSelectionChange={setActiveTagFilter}
          />
        </div>

        {/* Search/filter results count */}
        {(isSearchFiltered || isSpeakerFiltered || isTagFiltered) && (
          <p className="text-muted-foreground mt-2 text-xs">
            {searchFilteredCount} of {segments.length} segments
            {isTagFiltered && ' (filtered by tag)'}
          </p>
        )}
      </div>

      {/* Transcript list */}
      <div className="relative flex-1 overflow-hidden">
        <VirtualizedTranscript
          segments={tagFilteredSegments}
          sourceId={sourceId}
          allSegments={segments}
          activeTagFilter={activeTagFilter}
          onEditSegment={onEditSegment}
          onDeleteSegment={onDeleteSegment}
          onSpeakerChanged={onSpeakerChanged}
          readOnly={readOnly}
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

      {/* No search/filter results state */}
      {(isSearchFiltered || isSpeakerFiltered || isTagFiltered) &&
        searchFilteredCount === 0 &&
        segments.length > 0 && (
          <div className="text-muted-foreground flex flex-1 items-center justify-center">
            No matching segments found
          </div>
        )}
    </div>
  );
}
