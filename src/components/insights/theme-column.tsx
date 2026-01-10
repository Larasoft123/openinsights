'use client';

import { useDroppable } from '@dnd-kit/core';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DraggableHighlight } from './draggable-highlight';

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

interface ThemeColumnProps {
  id: string;
  title: string;
  description?: string | null;
  color: string;
  highlights: Highlight[];
  isUnassigned?: boolean;
  onDelete?: () => void;
}

export function ThemeColumn({
  id,
  title,
  description,
  color,
  highlights,
  isUnassigned = false,
  onDelete,
}: ThemeColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`flex w-72 flex-shrink-0 flex-col rounded-xl border bg-gray-900 transition-all ${
        isOver
          ? 'border-accent-primary bg-accent-primary/5 ring-accent-primary/20 ring-2'
          : 'border-gray-800'
      }`}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between border-b border-gray-800 p-3">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
          <h3 className="font-medium text-white">{title}</h3>
          <span className="text-sm text-gray-400">({highlights.length})</span>
        </div>
        {!isUnassigned && onDelete && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onDelete}
            className="h-7 w-7 text-gray-400 hover:text-red-400"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Description */}
      {description && (
        <div className="border-b border-gray-800 px-3 py-2">
          <p className="text-sm text-gray-400">{description}</p>
        </div>
      )}

      {/* Highlights */}
      <div className="flex-1 overflow-y-auto p-2">
        <div className="space-y-2">
          {highlights.map((highlight) => (
            <DraggableHighlight key={highlight.id} highlight={highlight} />
          ))}
          {highlights.length === 0 && (
            <div className="py-8 text-center text-sm text-gray-400">
              {isUnassigned ? 'All highlights assigned' : 'Drag highlights here'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
