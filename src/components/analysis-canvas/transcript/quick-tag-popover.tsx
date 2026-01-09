'use client';

import { useState, useCallback } from 'react';
import { Popover, PopoverContent, PopoverAnchor } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageSquare, Loader2, Plus, Check } from 'lucide-react';
import { TextSelectionInfo } from '../hooks/use-text-selection';
import { cn } from '@/lib/utils';

export interface TagData {
  id: string;
  name: string;
  color: string;
}

// Preset color palette for tag creation (Tailwind colors)
const TAG_COLORS = [
  '#EF4444', // red-500
  '#F97316', // orange-500
  '#EAB308', // yellow-500
  '#22C55E', // green-500
  '#06B6D4', // cyan-500
  '#3B82F6', // blue-500 (default)
  '#8B5CF6', // violet-500
  '#EC4899', // pink-500
];

interface QuickTagPopoverProps {
  selection: TextSelectionInfo | null;
  tags: TagData[];
  sourceId: string;
  projectId: string;
  onTagCreated?: (newTag?: TagData) => void;
  onClose: () => void;
}

type ViewState = 'list' | 'note' | 'create';

/**
 * QuickTagPopover Component
 *
 * Floating popover for quickly tagging selected transcript text.
 *
 * Features:
 * - Shows available project tags
 * - Inline tag creation with color picker
 * - Optional note input
 * - Creates highlight via API
 * - Position anchored to selection rectangle
 */
export function QuickTagPopover({
  selection,
  tags,
  sourceId,
  projectId,
  onTagCreated,
  onClose,
}: QuickTagPopoverProps) {
  const [viewState, setViewState] = useState<ViewState>('list');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);

  // Create tag form state
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[5]); // Default blue
  const [createError, setCreateError] = useState<string | null>(null);

  // Store selection data when popover opens to avoid losing it during async operations
  const [capturedSegmentId, setCapturedSegmentId] = useState<string | null>(null);
  const [capturedRect, setCapturedRect] = useState<DOMRect | null>(null);

  // Local tags state for optimistic updates
  const [localTags, setLocalTags] = useState<TagData[]>(tags);

  // Capture selection data when selection changes
  const currentSegmentId = selection?.segmentId ?? capturedSegmentId;
  const currentRect = selection?.rect ?? capturedRect;

  // Update captured data when selection is available
  if (selection?.segmentId && selection.segmentId !== capturedSegmentId) {
    setCapturedSegmentId(selection.segmentId);
    setCapturedRect(selection.rect);
  }

  const resetState = useCallback(() => {
    setViewState('list');
    setNote('');
    setIsSubmitting(false);
    setSelectedTagId(null);
    setNewTagName('');
    setNewTagColor(TAG_COLORS[5]);
    setCreateError(null);
    setCapturedSegmentId(null);
    setCapturedRect(null);
  }, []);

  const handleClose = useCallback(() => {
    resetState();
    onClose();
  }, [resetState, onClose]);

  // Create highlight via API
  const createHighlight = useCallback(
    async (tagId: string, noteText?: string) => {
      // Use captured segmentId to avoid issues with selection being cleared
      if (!currentSegmentId) {
        console.error('No segment ID available for highlight creation');
        return;
      }

      setIsSubmitting(true);

      try {
        const response = await fetch(`/api/sources/${sourceId}/highlights`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            segmentId: currentSegmentId,
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
    [currentSegmentId, sourceId, handleClose, onTagCreated]
  );

  // Create new tag via API
  const createTag = useCallback(async () => {
    if (!newTagName.trim()) {
      setCreateError('Tag name is required');
      return;
    }

    setIsSubmitting(true);
    setCreateError(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newTagName.trim(),
          color: newTagColor,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setCreateError(errorData.error || 'Failed to create tag');
        setIsSubmitting(false);
        return;
      }

      const newTag: TagData = await response.json();

      // Add to local tags for immediate use
      setLocalTags((prev) => [...prev, newTag]);

      // Notify parent about new tag
      onTagCreated?.(newTag);

      // Immediately create highlight with the new tag
      await createHighlight(newTag.id);
    } catch (error) {
      console.error('Error creating tag:', error);
      setCreateError('Failed to create tag');
      setIsSubmitting(false);
    }
  }, [newTagName, newTagColor, projectId, onTagCreated, createHighlight]);

  // Handle tag click
  const handleTagClick = useCallback(
    (tagId: string) => {
      if (viewState === 'note') {
        // If note input is visible, use current note
        createHighlight(tagId, note.trim() || undefined);
      } else {
        // Create highlight immediately without note
        createHighlight(tagId);
      }
    },
    [viewState, note, createHighlight]
  );

  // Handle add note button
  const handleAddNote = useCallback((tagId: string) => {
    setSelectedTagId(tagId);
    setViewState('note');
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

  // Handle create tag form submission
  const handleCreateSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      createTag();
    },
    [createTag]
  );

  // Keep popover open if we have a selection OR if we're in a state that needs to complete
  const shouldShowPopover =
    !!selection || !!(capturedSegmentId && (viewState !== 'list' || isSubmitting));

  if (!shouldShowPopover) return null;

  // Position the popover near the selection
  const anchorStyle: React.CSSProperties = currentRect
    ? {
        position: 'fixed',
        left: currentRect.left + currentRect.width / 2,
        top: currentRect.bottom + 8,
        width: 1,
        height: 1,
      }
    : {
        position: 'fixed',
        left: '50%',
        top: '50%',
        width: 1,
        height: 1,
      };

  // Use localTags for display (includes newly created tags)
  const displayTags = localTags;

  return (
    <Popover open={shouldShowPopover} onOpenChange={(open) => !open && handleClose()}>
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
        ) : viewState === 'note' ? (
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
              <Button type="button" variant="ghost" size="sm" onClick={() => setViewState('list')}>
                Back
              </Button>
              <Button type="submit" size="sm">
                Save
              </Button>
            </div>
          </form>
        ) : viewState === 'create' ? (
          <form onSubmit={handleCreateSubmit} className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Plus className="size-4" />
              Create Tag
            </div>

            <Input
              type="text"
              placeholder="Tag name..."
              value={newTagName}
              onChange={(e) => {
                setNewTagName(e.target.value);
                setCreateError(null);
              }}
              autoFocus
              className="h-8 text-sm"
            />

            {/* Color palette */}
            <div className="flex flex-wrap gap-1.5">
              {TAG_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setNewTagColor(color)}
                  className={cn(
                    'flex size-6 items-center justify-center rounded-full transition-transform hover:scale-110',
                    newTagColor === color && 'ring-2 ring-offset-2'
                  )}
                  style={{ backgroundColor: color }}
                  title={color}
                >
                  {newTagColor === color && <Check className="size-3 text-white" />}
                </button>
              ))}
            </div>

            {createError && <p className="text-xs text-red-500">{createError}</p>}

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setViewState('list');
                  setNewTagName('');
                  setCreateError(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={!newTagName.trim()}>
                Create & Tag
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-1">
            <div className="text-muted-foreground px-2 py-1 text-xs font-medium">Quick Tag</div>

            {/* Tag list */}
            {displayTags.map((tag) => (
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
            ))}

            {/* Divider before create button */}
            {displayTags.length > 0 && <div className="border-border my-1 border-t" />}

            {/* Create new tag button */}
            <button
              type="button"
              onClick={() => setViewState('create')}
              className="hover:bg-muted text-muted-foreground hover:text-foreground flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors"
            >
              <Plus className="size-3" />
              Create new tag
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
