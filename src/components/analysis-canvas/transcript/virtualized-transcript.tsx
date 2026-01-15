'use client';

import { useRef, useEffect, useMemo, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useVideoPlayerStore, selectIsAutoScrollActive } from '@/lib/stores/video-player-store';
import { TranscriptSegment, TranscriptSegmentData } from './transcript-segment';

interface VirtualizedTranscriptProps {
  segments: TranscriptSegmentData[];
  sourceId?: string;
  allSegments?: TranscriptSegmentData[];
  activeTagFilter?: string | null;
  onEditSegment?: (segment: TranscriptSegmentData) => void;
  onDeleteSegment?: (segment: TranscriptSegmentData) => void;
  onSpeakerChanged?: () => void;
  onSuggestionStatusChange?: (suggestionId: string, status: 'approved' | 'rejected') => void;
  readOnly?: boolean;
}

// Estimated row height for virtualization (initial estimate before measurement)
// Segments have py-3 (24px) + text content (~20px) + potential multi-line text
const ESTIMATED_ROW_HEIGHT = 80;

// Tolerance for time comparison (accounts for browser seek rounding)
// Browsers may round seek positions to keyframes, causing slight time differences
const TIME_EPSILON = 0.1; // 100ms tolerance

/**
 * VirtualizedTranscript Component
 *
 * Renders a virtualized list of transcript segments using TanStack Virtual.
 *
 * Key features:
 * - Efficient rendering for 2-hour+ transcripts (7200+ segments)
 * - Dynamic row heights for variable-length content
 * - Active segment calculation based on video currentTime
 * - Click-to-seek via TranscriptSegment
 * - User-interruption detection for auto-scroll
 * - Support for filtered segments (search)
 */
export function VirtualizedTranscript({
  segments,
  sourceId,
  allSegments,
  activeTagFilter,
  onEditSegment,
  onDeleteSegment,
  onSpeakerChanged,
  onSuggestionStatusChange,
  readOnly = false,
}: VirtualizedTranscriptProps) {
  'use no memo'; // TanStack Virtual returns functions that cannot be safely memoized by React Compiler
  const parentRef = useRef<HTMLDivElement>(null);
  const lastProgrammaticScrollRef = useRef<number>(0);

  // Store state
  const currentTime = useVideoPlayerStore((state) => state.currentTime);
  const filteredSegmentIds = useVideoPlayerStore((state) => state.filteredSegmentIds);
  const setActiveSegmentId = useVideoPlayerStore((state) => state.setActiveSegmentId);
  const setUserScrolledAway = useVideoPlayerStore((state) => state.setUserScrolledAway);
  const isAutoScrollActive = useVideoPlayerStore(selectIsAutoScrollActive);

  // Filter segments if search is active
  const displayedSegments = useMemo(() => {
    if (!filteredSegmentIds) return segments;
    const filterSet = new Set(filteredSegmentIds);
    return segments.filter((s) => filterSet.has(s.id));
  }, [segments, filteredSegmentIds]);

  // Create a stable key for segment identity to detect additions/removals
  const segmentKey = useMemo(() => {
    return displayedSegments.map((s) => s.id).join(',');
  }, [displayedSegments]);

  // Calculate active segment based on currentTime
  // Active segment is the one where currentTime falls within [startTime, endTime]
  const activeSegmentIndex = useMemo(() => {
    if (displayedSegments.length === 0) return -1;

    // Binary search for efficiency with large transcripts
    let left = 0;
    let right = displayedSegments.length - 1;

    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const segment = displayedSegments[mid];

      // Use epsilon tolerance to account for browser seek rounding
      // Without this, clicking a segment might select the previous one
      // because browsers round seek positions to keyframes
      if (currentTime < segment.startTime - TIME_EPSILON) {
        right = mid - 1;
      } else if (currentTime > segment.endTime + TIME_EPSILON) {
        left = mid + 1;
      } else {
        // currentTime is within this segment (with tolerance)
        return mid;
      }
    }

    // If not found exactly, return the closest previous segment
    // (the one that just ended before currentTime)
    return Math.max(0, right);
  }, [displayedSegments, currentTime]);

  const activeSegment = displayedSegments[activeSegmentIndex];

  // Update store with active segment ID
  useEffect(() => {
    const segmentId = activeSegment?.id ?? null;
    setActiveSegmentId(segmentId);
  }, [activeSegment?.id, setActiveSegmentId]);

  // Initialize virtualizer with dynamic sizing
  // eslint-disable-next-line react-hooks/incompatible-library -- Opted out via 'use no memo' directive
  const virtualizer = useVirtualizer({
    count: displayedSegments.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ESTIMATED_ROW_HEIGHT,
    overscan: 10, // Render extra items above/below viewport for smooth scrolling
  });

  // Remeasure when segments are added/removed to prevent visual overlap
  // This is needed because TanStack Virtual caches row measurements,
  // and when segments are deleted, cached measurements for shifted indices cause glitches
  useEffect(() => {
    virtualizer.measure();
  }, [segmentKey, virtualizer]);

  // Auto-scroll to active segment
  useEffect(() => {
    if (!isAutoScrollActive || activeSegmentIndex < 0) return;

    // Mark this as a programmatic scroll
    lastProgrammaticScrollRef.current = Date.now();

    virtualizer.scrollToIndex(activeSegmentIndex, {
      align: 'center',
      behavior: 'smooth',
    });
  }, [activeSegmentIndex, isAutoScrollActive, virtualizer]);

  // Detect user manual scroll (user-interruption detection)
  const handleScroll = useCallback(() => {
    const now = Date.now();
    // If scroll happened within 300ms of programmatic scroll, ignore it
    if (now - lastProgrammaticScrollRef.current < 300) return;

    // Check if the active segment is still visible in the viewport
    if (activeSegmentIndex < 0) return;

    const range = virtualizer.range;
    if (!range) return;

    const isActiveVisible =
      activeSegmentIndex >= range.startIndex && activeSegmentIndex <= range.endIndex;

    // If user scrolled away from active segment, mark as scrolled away
    if (!isActiveVisible) {
      setUserScrolledAway(true);
    }
  }, [activeSegmentIndex, virtualizer, setUserScrolledAway]);

  const virtualItems = virtualizer.getVirtualItems();

  return (
    <div
      ref={parentRef}
      onScroll={handleScroll}
      className="h-full overflow-auto pb-16"
      style={{ contain: 'strict' }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualItems.map((virtualItem) => {
          const segment = displayedSegments[virtualItem.index];
          const isActive = virtualItem.index === activeSegmentIndex;

          return (
            <div
              key={segment.id}
              data-index={virtualItem.index}
              ref={virtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <TranscriptSegment
                segment={segment}
                isActive={isActive}
                sourceId={sourceId}
                allSegments={allSegments}
                activeTagFilter={activeTagFilter}
                onEdit={onEditSegment}
                onDelete={onDeleteSegment}
                onSpeakerChanged={onSpeakerChanged}
                onSuggestionStatusChange={onSuggestionStatusChange}
                readOnly={readOnly}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
