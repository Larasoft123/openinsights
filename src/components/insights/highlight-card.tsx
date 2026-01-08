'use client';

import Link from 'next/link';
import { Clock, ExternalLink } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

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

function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function HighlightCard({ highlight, isDragging = false }: HighlightCardProps) {
  return (
    <Card
      className={`cursor-grab active:cursor-grabbing ${isDragging ? 'rotate-3 shadow-lg' : ''}`}
    >
      <CardContent className="p-3">
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
        <p className="line-clamp-3 text-sm">{highlight.segment.content}</p>

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
          <div className="bg-muted/50 mt-2 rounded p-2 text-xs">{highlight.note}</div>
        )}
      </CardContent>
    </Card>
  );
}
