'use client';

import { useState, useMemo } from 'react';
import { Tag } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { TranscriptSegmentData } from './transcript-segment';

interface TagFilterProps {
  segments: TranscriptSegmentData[];
  selectedTagId: string | null; // null = all tags (no filter)
  onSelectionChange: (tagId: string | null) => void;
}

interface TagCount {
  id: string;
  name: string;
  color: string;
  count: number;
}

/**
 * TagFilter Component
 *
 * Dropdown to filter transcript by tag.
 * Shows tags from highlights in segments with counts.
 */
export function TagFilter({ segments, selectedTagId, onSelectionChange }: TagFilterProps) {
  const [open, setOpen] = useState(false);

  // Compute tag counts from segments' highlights
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

  // No tags = no highlights in source
  if (tagCounts.length === 0) {
    return null;
  }

  const selectedTag = selectedTagId ? tagCounts.find((t) => t.id === selectedTagId) : null;
  const totalHighlights = tagCounts.reduce((sum, t) => sum + t.count, 0);

  const handleSelectTag = (tagId: string) => {
    // Toggle: if same tag, clear; otherwise select
    onSelectionChange(selectedTagId === tagId ? null : tagId);
  };

  const handleClearFilter = () => {
    onSelectionChange(null);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ${
            selectedTagId
              ? 'bg-accent-primary text-foreground shadow-lg'
              : 'bg-muted text-muted-foreground hover:text-foreground hover:bg-gray-700'
          }`}
        >
          <Tag size={16} strokeWidth={1.5} />
          {selectedTag ? (
            <span className="flex items-center gap-1.5">
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: selectedTag.color }}
              />
              {selectedTag.name}
            </span>
          ) : (
            `All Tags (${totalHighlights})`
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Filter by Tag</span>
          {selectedTagId && (
            <button
              onClick={handleClearFilter}
              className="text-muted-foreground hover:text-foreground text-xs"
            >
              Reset
            </button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {tagCounts.map((tag) => (
          <DropdownMenuCheckboxItem
            key={tag.id}
            checked={selectedTagId === tag.id}
            onCheckedChange={() => handleSelectTag(tag.id)}
            onSelect={(e) => e.preventDefault()}
            className="gap-2"
          >
            <span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: tag.color }} />
            <span className="flex-1 truncate">{tag.name}</span>
            <span className="text-muted-foreground text-xs">({tag.count})</span>
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
