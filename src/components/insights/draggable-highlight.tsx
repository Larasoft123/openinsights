'use client';

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { HighlightCard } from './highlight-card';

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

interface DraggableHighlightProps {
  highlight: Highlight;
}

export function DraggableHighlight({ highlight }: DraggableHighlightProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: highlight.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <HighlightCard highlight={highlight} />
    </div>
  );
}
