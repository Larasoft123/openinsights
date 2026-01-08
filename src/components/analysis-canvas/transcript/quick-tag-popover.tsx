'use client';

import { useState, useCallback } from 'react';
import { Popover, PopoverContent, PopoverAnchor } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageSquare, Loader2 } from 'lucide-react';
import { TextSelectionInfo } from '../hooks/use-text-selection';
import { cn } from '@/lib/utils';

export interface TagData {
  id: string;
  name: string;
  color: string;
}

interface QuickTagPopoverProps {
  selection: TextSelectionInfo | null;
  tags: TagData[];
  sourceId: string;
  onTagCreated?: () => void;
  onClose: () => void;
}

/**
 * QuickTagPopover Component
 *
 * Floating popover for quickly tagging selected transcript text.
 *
 * Features:
 * - Shows available project tags
 * - Optional note input
 * - Creates highlight via API
 * - Position anchored to selection rectangle
 */
export function QuickTagPopover({
  selection,
  tags,
  sourceId,
  onTagCreated,
  onClose,
}: QuickTagPopoverProps) {
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);

  const resetState = useCallback(() => {
    setShowNoteInput(false);
    setNote('');
    setIsSubmitting(false);
    setSelectedTagId(null);
  }, []);

  const handleClose = useCallback(() => {
    resetState();
    onClose();
  }, [resetState, onClose]);

  // Create highlight via API
  const createHighlight = useCallback(
    async (tagId: string, noteText?: string) => {
      if (!selection) return;

      setIsSubmitting(true);

      try {
        const response = await fetch(`/api/sources/${sourceId}/highlights`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            segmentId: selection.segmentId,
            tagId,
            note: noteText || undefined,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error('Failed to create highlight:', errorData);
          return;
        }

        // Success - close popover and notify parent
        handleClose();
        onTagCreated?.();
      } catch (error) {
        console.error('Error creating highlight:', error);
      } finally {
        setIsSubmitting(false);
      }
    },
    [selection, sourceId, handleClose, onTagCreated]
  );

  // Handle tag click
  const handleTagClick = useCallback(
    (tagId: string) => {
      if (showNoteInput) {
        // If note input is visible, use current note
        createHighlight(tagId, note.trim() || undefined);
      } else {
        // Create highlight immediately without note
        createHighlight(tagId);
      }
    },
    [showNoteInput, note, createHighlight]
  );

  // Handle add note button
  const handleAddNote = useCallback((tagId: string) => {
    setSelectedTagId(tagId);
    setShowNoteInput(true);
  }, []);

  // Handle note submission
  const handleNoteSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (selectedTagId) {
        createHighlight(selectedTagId, note.trim() || undefined);
      }
    },
    [selectedTagId, note, createHighlight]
  );

  if (!selection) return null;

  // Position the popover near the selection
  const anchorStyle: React.CSSProperties = {
    position: 'fixed',
    left: selection.rect.left + selection.rect.width / 2,
    top: selection.rect.bottom + 8,
    width: 1,
    height: 1,
  };

  return (
    <Popover open={!!selection} onOpenChange={(open) => !open && handleClose()}>
      <PopoverAnchor style={anchorStyle} />
      <PopoverContent
        data-quick-tag-popover
        className="w-64 p-2"
        align="center"
        side="bottom"
        sideOffset={0}
      >
        {isSubmitting ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="text-muted-foreground size-5 animate-spin" />
          </div>
        ) : showNoteInput ? (
          <form onSubmit={handleNoteSubmit} className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <MessageSquare className="size-4" />
              Add Note
            </div>
            <Input
              type="text"
              placeholder="Optional note..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              autoFocus
              className="h-8 text-sm"
            />
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowNoteInput(false)}
              >
                Back
              </Button>
              <Button type="submit" size="sm">
                Save
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-1">
            <div className="text-muted-foreground px-2 py-1 text-xs font-medium">Quick Tag</div>
            {tags.length === 0 ? (
              <div className="text-muted-foreground px-2 py-4 text-center text-sm">
                No tags available.
                <br />
                Create tags in project settings.
              </div>
            ) : (
              tags.map((tag) => (
                <div
                  key={tag.id}
                  className="group hover:bg-muted flex items-center gap-2 rounded-md px-2 py-1.5"
                >
                  <button
                    type="button"
                    onClick={() => handleTagClick(tag.id)}
                    className="flex flex-1 items-center gap-2 text-left"
                  >
                    <span
                      className="size-3 shrink-0 rounded-full"
                      style={{ backgroundColor: tag.color }}
                    />
                    <span className="truncate text-sm">{tag.name}</span>
                  </button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleAddNote(tag.id)}
                    className={cn(
                      'size-6 p-0 opacity-0 transition-opacity',
                      'group-hover:opacity-100 focus:opacity-100'
                    )}
                    title="Add note"
                  >
                    <MessageSquare className="size-3" />
                  </Button>
                </div>
              ))
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
