'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { TranscriptSegmentData } from '../transcript/transcript-segment';

interface SourceTagsProps {
  segments: TranscriptSegmentData[];
  activeTagId?: string | null;
  onTagClick?: (tagId: string | null) => void;
}

interface TagCount {
  id: string;
  name: string;
  color: string;
  count: number;
}

/**
 * SourceTags Component
 *
 * Displays all tags used in the current source with highlight counts.
 * Shows a summary of tagging activity for quick overview.
 * Clicking a tag filters the transcript to show only segments with that tag.
 */
export function SourceTags({ segments, activeTagId, onTagClick }: SourceTagsProps) {
  // Compute tag counts from segments
  const tagCounts = useMemo(() => {
    const counts = new Map<string, TagCount>();

    for (const segment of segments) {
      if (!segment.highlights) continue;

      for (const highlight of segment.highlights) {
        const existing = counts.get(highlight.tag.id);
        if (existing) {
          existing.count++;
        } else {
          counts.set(highlight.tag.id, {
            id: highlight.tag.id,
            name: highlight.tag.name,
            color: highlight.tag.color,
            count: 1,
          });
        }
      }
    }

    // Sort by count descending
    return Array.from(counts.values()).sort((a, b) => b.count - a.count);
  }, [segments]);

  if (tagCounts.length === 0) {
    return (
      <div className="text-muted-foreground px-1 text-xs">
        No tags yet. Select transcript text to add tags.
      </div>
    );
  }

  const handleTagClick = (tagId: string) => {
    if (!onTagClick) return;
    // Toggle: if already active, clear filter; otherwise set filter
    onTagClick(activeTagId === tagId ? null : tagId);
  };

  return (
    <div className="flex flex-wrap gap-2">
      {tagCounts.map((tag) => {
        const isActive = activeTagId === tag.id;
        return (
          <button
            key={tag.id}
            type="button"
            onClick={() => handleTagClick(tag.id)}
            className={cn(
              'flex items-center gap-1.5 rounded-full px-2.5 py-1 transition-all',
              'hover:ring-2 hover:ring-offset-1 hover:ring-offset-gray-900',
              onTagClick && 'cursor-pointer',
              isActive ? 'ring-2 ring-offset-1 ring-offset-gray-900' : 'bg-muted/50 hover:bg-muted'
            )}
            style={{
              backgroundColor: isActive ? `${tag.color}30` : undefined,
              ['--tw-ring-color' as string]: tag.color,
            }}
            title={isActive ? 'Click to clear filter' : `Filter by "${tag.name}"`}
          >
            <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: tag.color }} />
            <span className="text-xs font-medium">{tag.name}</span>
            <span className="text-muted-foreground text-xs">({tag.count})</span>
          </button>
        );
      })}
      {activeTagId && (
        <button
          type="button"
          onClick={() => onTagClick?.(null)}
          className="text-muted-foreground hover:text-foreground flex items-center gap-1 rounded-full px-2 py-1 text-xs transition-colors"
        >
          Clear filter
        </button>
      )}
    </div>
  );
}
