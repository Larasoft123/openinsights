/**
 * Highlight Result Card Component
 *
 * Enhanced highlight card for evidence dashboard.
 * Follows Modern Smart Home Dashboard card pattern.
 */

'use client';

import { Clock, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import { formatTime } from '@/lib/utils/time';

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface HighlightResultCardProps {
  id: string;
  content: string;
  selectedText?: string | null;
  startTime: number;
  endTime: number;
  sourceId: string;
  sourceTitle: string;
  tag: Tag;
  note?: string | null;
  similarity?: number;
}

export function HighlightResultCard({
  content,
  selectedText,
  startTime,
  endTime,
  sourceId,
  sourceTitle,
  tag,
  note,
  similarity,
}: HighlightResultCardProps) {
  // Use selectedText if available, otherwise fall back to full content
  const displayContent = selectedText || content;
  return (
    <Link href={`/sources/${sourceId}?t=${startTime}`}>
      <div className="group border-border bg-background hover:border-border hover:bg-muted cursor-pointer overflow-hidden rounded-xl border p-4 transition-all duration-200">
        {/* Header */}
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: tag.color }} />
            <span className="text-xs font-medium" style={{ color: tag.color }}>
              {tag.name}
            </span>
          </div>
          {similarity !== undefined && (
            <span className="rounded-full bg-purple-500/20 px-2 py-0.5 text-xs text-purple-400">
              {Math.round(similarity * 100)}% match
            </span>
          )}
        </div>

        {/* Source */}
        <div className="text-muted-foreground mb-2 text-xs">{sourceTitle}</div>

        {/* Content - show selectedText (exact quote) if available, otherwise full segment */}
        <p className="text-foreground mb-3 line-clamp-3 text-sm">
          {selectedText ? (
            <span>
              <span className="text-muted-foreground">&ldquo;</span>
              {displayContent}
              <span className="text-muted-foreground">&rdquo;</span>
            </span>
          ) : (
            displayContent
          )}
        </p>

        {/* Note (if exists) */}
        {note && (
          <div className="bg-muted/50 mb-3 flex items-start gap-2 rounded-lg p-2">
            <MessageSquare
              size={14}
              strokeWidth={1.5}
              className="text-muted-foreground mt-0.5 flex-shrink-0"
            />
            <p className="text-xs text-gray-300">{note}</p>
          </div>
        )}

        {/* Timestamp */}
        <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
          <Clock size={12} strokeWidth={1.5} />
          <span>
            {formatTime(startTime)} - {formatTime(endTime)}
          </span>
        </div>
      </div>
    </Link>
  );
}
