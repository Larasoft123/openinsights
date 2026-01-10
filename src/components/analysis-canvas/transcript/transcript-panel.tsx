'use client';

import { useState, useMemo } from 'react';
import { useVideoPlayerStore, selectShouldShowResumeButton } from '@/lib/stores/video-player-store';
import { Button } from '@/components/ui/button';
import { ArrowDown, Plus } from 'lucide-react';
import { VirtualizedTranscript } from './virtualized-transcript';
import { TranscriptSearch } from './transcript-search';
import { SpeakerFilter } from './speaker-filter';
import { TranscriptSegmentData } from './transcript-segment';
import { getUniqueSpeakers } from '@/lib/utils/speaker-colors';

interface TranscriptPanelProps {
  segments: TranscriptSegmentData[];
  sourceId: string;
  onEditSegment?: (segment: TranscriptSegmentData) => void;
  onDeleteSegment?: (segment: TranscriptSegmentData) => void;
  onAddSegment?: () => void;
  onSpeakerChanged?: () => void;
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
  sourceId,
  onEditSegment,
  onDeleteSegment,
  onAddSegment,
  onSpeakerChanged,
}: TranscriptPanelProps) {
  const filteredSegmentIds = useVideoPlayerStore((state) => state.filteredSegmentIds);
  const resumeAutoScroll = useVideoPlayerStore((state) => state.resumeAutoScroll);
  const shouldShowResumeButton = useVideoPlayerStore(selectShouldShowResumeButton);

  // Speaker filter state (null = all speakers)
  const [selectedSpeakers, setSelectedSpeakers] = useState<Set<string> | null>(null);

  // Check if source has diarization data
  const hasSpeakers = useMemo(() => getUniqueSpeakers(segments).length > 0, [segments]);

  // Filter segments by speaker selection
  const speakerFilteredSegments = useMemo(() => {
    if (selectedSpeakers === null) return segments;
    return segments.filter((s) => s.speakerId === null || selectedSpeakers.has(s.speakerId));
  }, [segments, selectedSpeakers]);

  // Calculate filtered count for search results
  const searchFilteredCount = filteredSegmentIds?.length ?? speakerFilteredSegments.length;
  const isSearchFiltered = filteredSegmentIds !== null;
  const isSpeakerFiltered = selectedSpeakers !== null;

  return (
    <div className="flex h-full flex-col">
      {/* Header with search and add button */}
      <div className="shrink-0 border-b border-gray-800 p-4">
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

        {/* Speaker filter - only show if diarization data exists */}
        {hasSpeakers && (
          <div className="mt-2">
            <SpeakerFilter
              segments={segments}
              selectedSpeakers={selectedSpeakers}
              onSelectionChange={setSelectedSpeakers}
            />
          </div>
        )}

        {/* Search/filter results count */}
        {(isSearchFiltered || isSpeakerFiltered) && (
          <p className="mt-2 text-xs text-gray-400">
            {searchFilteredCount} of {segments.length} segments
          </p>
        )}
      </div>

      {/* Transcript list */}
      <div className="relative flex-1 overflow-hidden">
        <VirtualizedTranscript
          segments={speakerFilteredSegments}
          sourceId={sourceId}
          allSegments={segments}
          onEditSegment={onEditSegment}
          onDeleteSegment={onDeleteSegment}
          onSpeakerChanged={onSpeakerChanged}
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
        <div className="flex flex-1 items-center justify-center text-gray-400">
          No transcript available
        </div>
      )}

      {/* No search/filter results state */}
      {(isSearchFiltered || isSpeakerFiltered) &&
        searchFilteredCount === 0 &&
        segments.length > 0 && (
          <div className="flex flex-1 items-center justify-center text-gray-400">
            No matching segments found
          </div>
        )}
    </div>
  );
}
