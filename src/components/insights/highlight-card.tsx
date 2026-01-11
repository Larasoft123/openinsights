'use client';

import Link from 'next/link';
import { Clock, ExternalLink } from 'lucide-react';
import { formatTime } from '@/lib/utils/time';
import { useShareContext } from '@/lib/contexts/read-only-context';

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
  const { basePath } = useShareContext();

  // Build link based on share context
  const sourcePath = basePath
    ? `${basePath}/sources/${highlight.segment.source.id}`
    : `/sources/${highlight.segment.source.id}`;

  return (
    <div
      className={`cursor-grab overflow-hidden rounded-lg border border-gray-800 bg-gray-800 p-3 transition-all active:cursor-grabbing ${
        isDragging
          ? 'ring-accent-primary/50 rotate-3 shadow-lg ring-2'
          : 'hover:bg-gray-750 hover:border-gray-700'
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
          href={`${sourcePath}?t=${highlight.segment.startTime}`}
          className="text-gray-400 hover:text-white"
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Content */}
      <p className="line-clamp-3 text-sm text-white">{highlight.segment.content}</p>

      {/* Footer */}
      <div className="mt-2 flex items-center justify-between">
        <span className="truncate text-xs text-gray-400">{highlight.segment.source.title}</span>
        <span className="flex items-center gap-1 text-xs text-gray-400">
          <Clock className="h-3 w-3" />
          {formatTime(highlight.segment.startTime)}
        </span>
      </div>

      {/* Note */}
      {highlight.note && (
        <div className="mt-2 rounded bg-gray-900/50 p-2 text-xs text-gray-300">
          {highlight.note}
        </div>
      )}
    </div>
  );
}
