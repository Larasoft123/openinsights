'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useVideoPlayerStore, selectShouldShowResumeButton } from '@/lib/stores/video-player-store';
import { Button } from '@/components/ui/button';
import { ArrowDown } from 'lucide-react';
import { VirtualizedTranscript } from './virtualized-transcript';
import { TranscriptSearch } from './transcript-search';
import { SpeakerFilter } from './speaker-filter';
import { TagFilter } from './tag-filter';
import { TranscriptSegmentData } from './transcript-segment';
import { getUniqueSpeakers } from '@/lib/utils/speaker-colors';
import { AISuggestionsProcessingStatus } from './ai-suggestions-banner';

interface TranscriptPanelProps {
  segments: TranscriptSegmentData[];
  sourceId: string;
  autoTaggingStatus?: string | null;
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
  autoTaggingStatus,
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

  // AI Suggestions state
  const [aiSuggestions, setAiSuggestions] = useState<
    Array<{
      id: string;
      segmentId: string;
      tagNames: string[];
      selectedText: string | null;
      confidence: number | null;
      aiNote: string | null;
      status: 'pending' | 'approved' | 'rejected';
      matchedTags: Array<{ id: string; name: string; color: string }>;
    }>
  >([]);

  // Fetch AI suggestions when status is PENDING_REVIEW or COMPLETED
  // Also refetch when segments change (e.g., after router.refresh())
  useEffect(() => {
    console.log(
      '[TranscriptPanel] useEffect triggered - autoTaggingStatus:',
      autoTaggingStatus,
      'segments.length:',
      segments.length
    );

    if (autoTaggingStatus !== 'PENDING_REVIEW' && autoTaggingStatus !== 'COMPLETED') {
      console.log('[TranscriptPanel] Clearing AI suggestions (status not ready)');
      setAiSuggestions([]);
      return;
    }

    const fetchSuggestions = async () => {
      console.log('[TranscriptPanel] Fetching AI suggestions from API...');
      try {
        const res = await fetch(`/api/sources/${sourceId}/ai-suggestions`);
        if (!res.ok) throw new Error('Failed to fetch suggestions');
        const data = await res.json();
        console.log('[TranscriptPanel] Fetched AI suggestions:', data.suggestions?.length ?? 0);
        console.log(
          '[TranscriptPanel] First 3 pending suggestions:',
          data.suggestions?.filter((s: { status: string }) => s.status === 'pending').slice(0, 3)
        );
        setAiSuggestions(data.suggestions ?? []);
      } catch (error) {
        console.error('Failed to fetch AI suggestions:', error);
        setAiSuggestions([]);
      }
    };

    void fetchSuggestions();
  }, [sourceId, autoTaggingStatus, segments.length]);

  // Update suggestion status in local state (for instant UI update)
  const handleSuggestionStatusChange = useCallback(
    (suggestionId: string, newStatus: 'approved' | 'rejected') => {
      console.log('[TranscriptPanel] Updating suggestion status:', suggestionId, newStatus);
      setAiSuggestions((prev) => {
        const updated = prev.map((s) => (s.id === suggestionId ? { ...s, status: newStatus } : s));
        console.log('[TranscriptPanel] AI suggestions after update:', updated);
        return updated;
      });
    },
    []
  );

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

  // Enrich ALL segments with AI suggestions (for finding next pending in auto-scroll)
  const allSegmentsWithSuggestions = useMemo(() => {
    if (aiSuggestions.length === 0) return segments;

    console.log(
      '[TranscriptPanel] Enriching segments with AI suggestions:',
      aiSuggestions.length,
      'total'
    );

    // Group ONLY pending suggestions by segmentId
    const suggestionsBySegment = new Map<string, typeof aiSuggestions>();
    for (const suggestion of aiSuggestions) {
      if (suggestion.status !== 'pending') {
        console.log(
          '[TranscriptPanel] Skipping non-pending suggestion:',
          suggestion.id,
          suggestion.status
        );
        continue; // Only show pending
      }

      if (!suggestionsBySegment.has(suggestion.segmentId)) {
        suggestionsBySegment.set(suggestion.segmentId, []);
      }
      suggestionsBySegment.get(suggestion.segmentId)!.push(suggestion);
    }

    console.log(
      '[TranscriptPanel] Pending suggestions grouped by segment:',
      suggestionsBySegment.size,
      'segments'
    );

    // Add suggestions to ALL segments (not filtered)
    return segments.map((segment) => {
      const segmentSuggestions = suggestionsBySegment.get(segment.id);
      if (!segmentSuggestions) return segment;

      return {
        ...segment,
        aiSuggestions: segmentSuggestions,
      };
    });
  }, [segments, aiSuggestions]);

  // Enrich filtered segments with AI suggestions (only show pending)
  const enrichedSegments = useMemo(() => {
    if (aiSuggestions.length === 0) return tagFilteredSegments;

    // Group ONLY pending suggestions by segmentId
    const suggestionsBySegment = new Map<string, typeof aiSuggestions>();
    for (const suggestion of aiSuggestions) {
      if (suggestion.status !== 'pending') continue; // Only show pending

      if (!suggestionsBySegment.has(suggestion.segmentId)) {
        suggestionsBySegment.set(suggestion.segmentId, []);
      }
      suggestionsBySegment.get(suggestion.segmentId)!.push(suggestion);
    }

    // Add suggestions to filtered segments
    return tagFilteredSegments.map((segment) => {
      const segmentSuggestions = suggestionsBySegment.get(segment.id);
      if (!segmentSuggestions) return segment;

      return {
        ...segment,
        aiSuggestions: segmentSuggestions,
      };
    });
  }, [tagFilteredSegments, aiSuggestions]);

  // Calculate AI suggestions statistics (ONLY for visible/filtered segments)
  // This prevents confusion when speaker/tag filters are active - user sees stats
  // that match what's actually displayed in the transcript
  const aiSuggestionsStats = useMemo(() => {
    if (aiSuggestions.length === 0) return null;

    // Get segment IDs that are currently visible (after speaker/tag filtering)
    const visibleSegmentIds = new Set(tagFilteredSegments.map((s) => s.id));

    // Filter suggestions to only those belonging to visible segments
    const visibleSuggestions = aiSuggestions.filter((s) => visibleSegmentIds.has(s.segmentId));

    if (visibleSuggestions.length === 0) return null;

    const total = visibleSuggestions.length;
    const approved = visibleSuggestions.filter((s) => s.status === 'approved').length;
    const pending = visibleSuggestions.filter((s) => s.status === 'pending').length;

    return { total, approved, pending };
  }, [aiSuggestions, tagFilteredSegments]);

  // Handle click on "to review" - scroll to first pending (not approved/rejected) suggestion
  const handleScrollToPending = useCallback(() => {
    console.log('[TranscriptPanel] Scrolling to first pending suggestion');
    console.log(
      '[TranscriptPanel] Enriched segments with suggestions:',
      enrichedSegments.filter((s) => s.aiSuggestions).length
    );
    console.log(
      '[TranscriptPanel] Full aiSuggestions state:',
      aiSuggestions.map((s) => ({ id: s.id, status: s.status, segmentId: s.segmentId }))
    );

    // Find first DISPLAYED segment with pending suggestions (from enrichedSegments, not allSegments)
    const firstPendingSegment = enrichedSegments.find(
      (seg) => seg.aiSuggestions && seg.aiSuggestions.length > 0
    );

    if (firstPendingSegment) {
      console.log('[TranscriptPanel] First pending segment:', firstPendingSegment.id);
      console.log(
        '[TranscriptPanel] Suggestions in this segment:',
        firstPendingSegment.aiSuggestions?.map((s) => ({ id: s.id, status: s.status }))
      );

      const element = document.querySelector(
        `[data-segment-id="${firstPendingSegment.id}"]`
      ) as HTMLElement;
      if (element) {
        console.log('[TranscriptPanel] Found DOM element, scrolling...');
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // Force hover state on all AI suggestion groups (inline and badges)
        const inlineSuggestionGroups = element.querySelectorAll('.group\\/suggestion');
        const badgeSuggestionGroups = element.querySelectorAll('.group\\/tag-suggestion');

        inlineSuggestionGroups.forEach((group) => {
          group.classList.add('force-hover-suggestion');
        });
        badgeSuggestionGroups.forEach((group) => {
          group.classList.add('force-hover-tag-suggestion');
        });

        // Remove force-hover after 3 seconds
        setTimeout(() => {
          inlineSuggestionGroups.forEach((group) => {
            group.classList.remove('force-hover-suggestion');
          });
          badgeSuggestionGroups.forEach((group) => {
            group.classList.remove('force-hover-tag-suggestion');
          });
        }, 3000);
      } else {
        console.error(
          '[TranscriptPanel] DOM element not found for segment:',
          firstPendingSegment.id
        );
      }
    } else {
      console.log('[TranscriptPanel] No pending segments found in displayed segments');
    }
  }, [enrichedSegments, aiSuggestions]);

  // Calculate filtered count for search results
  const searchFilteredCount = filteredSegmentIds?.length ?? enrichedSegments.length;
  const isSearchFiltered = filteredSegmentIds !== null;
  const isSpeakerFiltered = selectedSpeakers !== null;
  const isTagFiltered = activeTagFilter !== null && activeTagFilter !== undefined;

  return (
    <div className="flex h-full flex-col">
      {/* AI Processing Status */}
      {!readOnly && (
        <AISuggestionsProcessingStatus
          autoTaggingStatus={autoTaggingStatus}
          stats={aiSuggestionsStats}
          onClickPending={handleScrollToPending}
        />
      )}

      {/* Header with search and filters on one line */}
      <div className="shrink-0 border-b border-gray-800 p-4">
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
          <p className="mt-2 text-xs text-gray-400">
            {searchFilteredCount} of {segments.length} segments
            {isTagFiltered && ' (filtered by tag)'}
          </p>
        )}
      </div>

      {/* Transcript list */}
      <div className="relative flex-1 overflow-hidden">
        <VirtualizedTranscript
          segments={enrichedSegments}
          sourceId={sourceId}
          allSegments={allSegmentsWithSuggestions}
          activeTagFilter={activeTagFilter}
          onEditSegment={onEditSegment}
          onDeleteSegment={onDeleteSegment}
          onSpeakerChanged={onSpeakerChanged}
          onSuggestionStatusChange={handleSuggestionStatusChange}
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
        <div className="flex flex-1 items-center justify-center text-gray-400">
          No transcript available
        </div>
      )}

      {/* No search/filter results state */}
      {(isSearchFiltered || isSpeakerFiltered || isTagFiltered) &&
        searchFilteredCount === 0 &&
        segments.length > 0 && (
          <div className="flex flex-1 items-center justify-center text-gray-400">
            No matching segments found
          </div>
        )}
    </div>
  );
}
