'use client';

import { useState } from 'react';
import { X, Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface EditableTagListProps {
  tags: Tag[];
  projectTags: Tag[];
  onDeleteTag: (tagId: string) => Promise<void>;
  onAddTag: (tagId: string, tagName: string) => Promise<void>;
  disabled?: boolean;
  className?: string;
  /** For AI suggestions, exclude tags by name; for highlights, exclude by ID */
  excludeByName?: boolean;
}

/**
 * EditableTagList Component
 *
 * Displays tags with delete functionality and add dropdown.
 * - X icon appears on hover over tag
 * - Optimistic delete with rollback on error
 * - Loading state while deleting
 * - + button opens dropdown to select from available project tags
 */
export function EditableTagList({
  tags,
  projectTags,
  onDeleteTag,
  onAddTag,
  disabled = false,
  className = '',
  excludeByName = false,
}: EditableTagListProps) {
  const [deletingTagId, setDeletingTagId] = useState<string | null>(null);
  const [addingTagId, setAddingTagId] = useState<string | null>(null);

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

  const handleAddTag = async (tagId: string, tagName: string) => {
    setAddingTagId(tagId);
    try {
      await onAddTag(tagId, tagName);
    } catch (error) {
      console.error('Failed to add tag:', error);
    } finally {
      setAddingTagId(null);
    }
  };

  // Filter out tags that are already assigned
  const availableTags = excludeByName
    ? projectTags.filter((pt) => !tags.some((t) => t.name === pt.name))
    : projectTags.filter((pt) => !tags.some((t) => t.id === pt.id));

  if (tags.length === 0 && !disabled) {
    // Show add dropdown when no tags
    return (
      <div className={className}>
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              disabled={disabled || availableTags.length === 0}
              className="h-auto p-0 text-gray-400 hover:bg-transparent hover:text-white"
            >
              <Plus className="mr-1 size-3" />
              <span className="text-xs">Add tag</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="max-h-60 overflow-y-auto">
            {availableTags.length === 0 ? (
              <div className="px-2 py-1.5 text-xs text-gray-400">No tags available</div>
            ) : (
              availableTags.map((tag) => (
                <DropdownMenuItem
                  key={tag.id}
                  onClick={() => void handleAddTag(tag.id, tag.name)}
                  disabled={addingTagId !== null}
                  className="flex cursor-pointer items-center gap-2"
                >
                  <span
                    className="size-3 shrink-0 rounded-full"
                    style={{ backgroundColor: tag.color }}
                  />
                  <span className="text-sm">{tag.name}</span>
                  {addingTagId === tag.id && <Loader2 className="ml-auto size-3 animate-spin" />}
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>
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
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              disabled={disabled || availableTags.length === 0 || addingTagId !== null}
              className="h-auto p-1 text-gray-400 hover:bg-gray-800 hover:text-white"
              aria-label="Add tag"
            >
              {addingTagId !== null ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Plus className="size-3.5" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="max-h-60 overflow-y-auto">
            {availableTags.length === 0 ? (
              <div className="px-2 py-1.5 text-xs text-gray-400">All tags assigned</div>
            ) : (
              availableTags.map((tag) => (
                <DropdownMenuItem
                  key={tag.id}
                  onClick={() => void handleAddTag(tag.id, tag.name)}
                  disabled={addingTagId !== null}
                  className="flex cursor-pointer items-center gap-2"
                >
                  <span
                    className="size-3 shrink-0 rounded-full"
                    style={{ backgroundColor: tag.color }}
                  />
                  <span className="text-sm">{tag.name}</span>
                  {addingTagId === tag.id && <Loader2 className="ml-auto size-3 animate-spin" />}
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
