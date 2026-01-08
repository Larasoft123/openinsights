'use client';

import { useCallback } from 'react';
import { cn } from '@/lib/utils';
import { formatTime, useVideoPlayerStore } from '@/lib/stores/video-player-store';

/**
 * Transcript Segment Types
 *
 * Matches the TranscriptSegment Prisma model fields used in display
 */
export interface TranscriptSegmentData {
  id: string;
  content: string;
  startTime: number;
  endTime: number;
  speakerId: string | null;
  highlights?: Array<{
    id: string;
    tag: {
      id: string;
      name: string;
      color: string;
    };
  }>;
}

interface TranscriptSegmentProps {
  segment: TranscriptSegmentData;
  isActive: boolean;
  style?: React.CSSProperties;
}

/**
 * TranscriptSegment Component
 *
 * Renders a single transcript segment with:
 * - Timestamp (click-to-seek)
 * - Speaker ID (if available)
 * - Content text
 * - Active state highlighting
 * - Tag indicators for highlighted segments
 */
export function TranscriptSegment({ segment, isActive, style }: TranscriptSegmentProps) {
  const seekTo = useVideoPlayerStore((state) => state.seekTo);

  // Click-to-seek: Jump to segment start time
  const handleClick = useCallback(() => {
    seekTo(segment.startTime);
  }, [seekTo, segment.startTime]);

  // Keyboard accessibility: Allow Enter/Space to trigger seek
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        seekTo(segment.startTime);
      }
    },
    [seekTo, segment.startTime]
  );

  const hasHighlights = segment.highlights && segment.highlights.length > 0;

  return (
    <div
      role="button"
      tabIndex={0}
      data-segment-id={segment.id}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      style={style}
      className={cn(
        'group flex cursor-pointer gap-3 px-4 py-2 transition-colors',
        'hover:bg-muted/50 focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset',
        isActive && 'bg-primary/10 border-l-primary border-l-2'
      )}
    >
      {/* Timestamp */}
      <span
        className={cn(
          'shrink-0 font-mono text-xs tabular-nums',
          isActive ? 'text-primary font-medium' : 'text-muted-foreground'
        )}
      >
        {formatTime(segment.startTime)}
      </span>

      {/* Speaker (if available) */}
      {segment.speakerId && (
        <span className="text-muted-foreground shrink-0 text-xs font-medium">
          [{segment.speakerId}]
        </span>
      )}

      {/* Content */}
      <span className={cn('flex-1 text-sm leading-relaxed', isActive && 'text-foreground')}>
        {segment.content}
      </span>

      {/* Tag indicators */}
      {hasHighlights && (
        <div className="flex shrink-0 items-center gap-1">
          {segment.highlights!.map((highlight) => (
            <span
              key={highlight.id}
              className="size-2 rounded-full"
              style={{ backgroundColor: highlight.tag.color }}
              title={highlight.tag.name}
            />
          ))}
        </div>
      )}
    </div>
  );
}
