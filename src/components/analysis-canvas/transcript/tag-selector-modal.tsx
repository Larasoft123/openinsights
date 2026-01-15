'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface TagSelectorModalProps {
  open: boolean;
  onClose: () => void;
  onSelectTag: (tagId: string, tagName: string) => Promise<void>;
  projectId: string;
  currentTags: string[]; // Tag IDs or names already assigned (to hide from list)
  excludeByName?: boolean; // If true, currentTags are tag names instead of IDs
}

/**
 * TagSelectorModal Component
 *
 * Modal for selecting a tag to add to a highlight or AI suggestion.
 * - Fetches project tags from API
 * - Shows scrollable list of available tags
 * - Filters out tags already assigned
 * - Click tag → add to highlight/suggestion → close modal
 */
export function TagSelectorModal({
  open,
  onClose,
  onSelectTag,
  projectId,
  currentTags,
  excludeByName = false,
}: TagSelectorModalProps) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch tags when modal opens
  useEffect(() => {
    if (open && projectId) {
      void fetchTags();
    }
  }, [open, projectId]);

  const fetchTags = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/tags`);
      if (!res.ok) {
        throw new Error('Failed to fetch tags');
      }
      const data = await res.json();
      setTags(data.tags || []);
    } catch (err) {
      console.error('Failed to fetch tags:', err);
      setError('Failed to load tags');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectTag = async (tagId: string, tagName: string) => {
    setIsSelecting(true);
    try {
      await onSelectTag(tagId, tagName);
      onClose();
    } catch (err) {
      console.error('Failed to add tag:', err);
      setError('Failed to add tag');
    } finally {
      setIsSelecting(false);
    }
  };

  // Filter out tags that are already assigned
  const availableTags = tags.filter((tag) => {
    if (excludeByName) {
      // currentTags are tag names (for AI suggestions)
      return !currentTags.map((name) => name.toLowerCase()).includes(tag.name.toLowerCase());
    } else {
      // currentTags are tag IDs (for highlights)
      return !currentTags.includes(tag.id);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Tag</DialogTitle>
        </DialogHeader>

        <div className="mt-4">
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          )}

          {error && (
            <div className="rounded border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {!isLoading && !error && availableTags.length === 0 && (
            <div className="py-8 text-center text-sm text-gray-400">No tags available</div>
          )}

          {!isLoading && !error && availableTags.length > 0 && (
            <div className="max-h-96 space-y-1 overflow-y-auto">
              {availableTags.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => void handleSelectTag(tag.id, tag.name)}
                  disabled={isSelecting}
                  className="flex w-full items-center gap-2 rounded px-3 py-2 text-left transition-colors hover:bg-gray-800 disabled:opacity-50"
                >
                  <div
                    className="h-3 w-3 shrink-0 rounded"
                    style={{ backgroundColor: tag.color }}
                  />
                  <span className="flex-1 text-sm text-gray-200">{tag.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
