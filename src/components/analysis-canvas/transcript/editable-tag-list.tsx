'use client';

import { useState } from 'react';
import { X, Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface EditableTagListProps {
  tags: Tag[];
  onDeleteTag: (tagId: string) => Promise<void>;
  onAddTag: () => void;
  disabled?: boolean;
  className?: string;
}

/**
 * EditableTagList Component
 *
 * Displays tags with delete functionality and add button.
 * - X icon appears on hover over tag
 * - Optimistic delete with rollback on error
 * - Loading state while deleting
 * - + button to add new tags (opens selector modal)
 */
export function EditableTagList({
  tags,
  onDeleteTag,
  onAddTag,
  disabled = false,
  className = '',
}: EditableTagListProps) {
  const [deletingTagId, setDeletingTagId] = useState<string | null>(null);

  const handleDeleteTag = async (tagId: string) => {
    setDeletingTagId(tagId);
    try {
      await onDeleteTag(tagId);
    } catch (error) {
      console.error('Failed to delete tag:', error);
    } finally {
      setDeletingTagId(null);
    }
  };

  if (tags.length === 0 && !disabled) {
    // Show add button only when no tags
    return (
      <div className={className}>
        <Button
          variant="ghost"
          size="sm"
          onClick={onAddTag}
          disabled={disabled}
          className="h-auto p-0 text-gray-400 hover:bg-transparent hover:text-white"
        >
          <Plus className="mr-1 size-3" />
          <span className="text-xs">Add tag</span>
        </Button>
      </div>
    );
  }

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      {tags.map((tag) => (
        <span
          key={tag.id}
          className="group relative inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium"
          style={{
            backgroundColor: `${tag.color}20`,
            color: tag.color,
            borderColor: `${tag.color}40`,
            borderWidth: '1px',
          }}
        >
          {tag.name}
          {!disabled && (
            <button
              onClick={() => void handleDeleteTag(tag.id)}
              disabled={deletingTagId === tag.id}
              className="ml-0.5 opacity-0 transition-opacity group-hover:opacity-100 hover:opacity-100"
              aria-label={`Remove ${tag.name} tag`}
            >
              {deletingTagId === tag.id ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <X className="size-3 hover:scale-110" />
              )}
            </button>
          )}
        </span>
      ))}

      {!disabled && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onAddTag}
          disabled={disabled}
          className="h-auto p-1 text-gray-400 hover:bg-gray-800 hover:text-white"
          aria-label="Add tag"
        >
          <Plus className="size-3.5" />
        </Button>
      )}
    </div>
  );
}
