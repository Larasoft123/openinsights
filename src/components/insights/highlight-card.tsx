'use client';

import Link from 'next/link';
import { Clock, ExternalLink } from 'lucide-react';
import { formatTime } from '@/lib/utils/time';

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface Segment {
  id: string;
  content: string;
  startTime: number;
  endTime: number;
  source: {
    id: string;
    title: string;
  };
}

interface Highlight {
  id: string;
  note: string | null;
  tag: Tag;
  segment: Segment;
}

interface HighlightCardProps {
  highlight: Highlight;
  isDragging?: boolean;
}

export function HighlightCard({ highlight, isDragging = false }: HighlightCardProps) {
  return (
    <div
      className={`border-border bg-muted cursor-grab overflow-hidden rounded-lg border p-3 transition-all active:cursor-grabbing ${
        isDragging
          ? 'ring-accent-primary/50 rotate-3 shadow-lg ring-2'
          : 'hover:bg-gray-750 hover:border-border'
      }`}
    >
      {/* Tag Badge */}
      <div className="mb-2 flex items-center justify-between">
        <span
          className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
          style={{
            backgroundColor: `${highlight.tag.color}20`,
            color: highlight.tag.color,
          }}
        >
          {highlight.tag.name}
        </span>
        <Link
          href={`/sources/${highlight.segment.source.id}?t=${highlight.segment.startTime}`}
          className="text-muted-foreground hover:text-foreground"
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Content */}
      <p className="text-foreground line-clamp-3 text-sm">{highlight.segment.content}</p>

      {/* Footer */}
      <div className="mt-2 flex items-center justify-between">
        <span className="text-muted-foreground truncate text-xs">
          {highlight.segment.source.title}
        </span>
        <span className="text-muted-foreground flex items-center gap-1 text-xs">
          <Clock className="h-3 w-3" />
          {formatTime(highlight.segment.startTime)}
        </span>
      </div>

      {/* Note */}
      {highlight.note && (
        <div className="bg-background/50 mt-2 rounded p-2 text-xs text-gray-300">
          {highlight.note}
        </div>
      )}
    </div>
  );
}
