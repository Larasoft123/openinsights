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
      className={`bg-card flex w-72 flex-shrink-0 flex-col rounded-lg border transition-colors ${
        isOver ? 'border-primary bg-primary/5' : ''
      }`}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between border-b p-3">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
          <h3 className="font-medium">{title}</h3>
          <span className="text-muted-foreground text-sm">({highlights.length})</span>
        </div>
        {!isUnassigned && onDelete && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onDelete}
            className="text-muted-foreground hover:text-destructive h-7 w-7"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Description */}
      {description && (
        <div className="border-b px-3 py-2">
          <p className="text-muted-foreground text-sm">{description}</p>
        </div>
      )}

      {/* Highlights */}
      <div className="flex-1 overflow-y-auto p-2">
        <div className="space-y-2">
          {highlights.map((highlight) => (
            <DraggableHighlight key={highlight.id} highlight={highlight} />
          ))}
          {highlights.length === 0 && (
            <div className="text-muted-foreground py-8 text-center text-sm">
              {isUnassigned ? 'All highlights assigned' : 'Drag highlights here'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
