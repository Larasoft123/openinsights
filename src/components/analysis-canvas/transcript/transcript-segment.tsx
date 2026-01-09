'use client';

import { useCallback } from 'react';
import { MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatTime, useVideoPlayerStore } from '@/lib/stores/video-player-store';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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
  onEdit?: (segment: TranscriptSegmentData) => void;
  onDelete?: (segment: TranscriptSegmentData) => void;
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
export function TranscriptSegment({
  segment,
  isActive,
  style,
  onEdit,
  onDelete,
}: TranscriptSegmentProps) {
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
        'group flex cursor-pointer gap-3 px-4 py-3 transition-colors',
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

      {/* Action menu */}
      {(onEdit || onDelete) && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'size-6 shrink-0 p-0 opacity-0 transition-opacity',
                'group-hover:opacity-100 focus:opacity-100'
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="size-4" />
              <span className="sr-only">Segment actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onEdit && (
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(segment);
                }}
              >
                <Pencil className="mr-2 size-4" />
                Edit segment
              </DropdownMenuItem>
            )}
            {onEdit && onDelete && <DropdownMenuSeparator />}
            {onDelete && (
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(segment);
                }}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 size-4" />
                Delete segment
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
