'use client';

import { useMemo } from 'react';
import { TranscriptSegmentData } from '../transcript/transcript-segment';

interface SourceTagsProps {
  segments: TranscriptSegmentData[];
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
 */
export function SourceTags({ segments }: SourceTagsProps) {
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

  return (
    <div className="flex flex-wrap gap-2">
      {tagCounts.map((tag) => (
        <div
          key={tag.id}
          className="bg-muted/50 flex items-center gap-1.5 rounded-full px-2.5 py-1"
        >
          <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: tag.color }} />
          <span className="text-xs font-medium">{tag.name}</span>
          <span className="text-muted-foreground text-xs">({tag.count})</span>
        </div>
      ))}
    </div>
  );
}
