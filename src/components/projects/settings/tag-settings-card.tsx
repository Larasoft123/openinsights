'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ColorPicker } from '@/components/ui/color-picker';
import { TagBadge } from '@/components/ui/tag-badge';
import { ChevronDown, Plus, Trash2, Loader2 } from 'lucide-react';
import { TAG_COLORS } from '@/lib/constants/colors';

interface Tag {
  id: string;
  name: string;
  color: string;
  description: string | null;
  highlightCount: number;
}

interface TagSettingsCardProps {
  projectId: string;
  initialTags: Tag[];
}

export function TagSettingsCard({ projectId, initialTags }: TagSettingsCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [tags, setTags] = useState<Tag[]>(initialTags);
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<'name' | 'description' | null>(null);
  const [editValue, setEditValue] = useState('');
  const [showColorPicker, setShowColorPicker] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState<string>(TAG_COLORS[5]); // Default blue
  const [newTagDescription, setNewTagDescription] = useState('');
  const [savingTagId, setSavingTagId] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const newTagInputRef = useRef<HTMLInputElement>(null);

  // Focus input when editing starts
  useEffect(() => {
    if (editingTagId && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editingTagId, editingField]);

  // Focus new tag input when creating
  useEffect(() => {
    if (isCreating && newTagInputRef.current) {
      newTagInputRef.current.focus();
    }
  }, [isCreating]);

  const inputClass =
    'w-full rounded-lg border border-gray-800 bg-gray-950 px-3 py-1.5 text-sm text-white placeholder-gray-500 transition-colors outline-none focus:border-accent-primary';

  // Update tag via API
  const updateTag = useCallback(
    async (tagId: string, data: { name?: string; color?: string; description?: string | null }) => {
      setSavingTagId(tagId);
      try {
        const response = await fetch(`/api/projects/${projectId}/tags/${tagId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to update tag');
        }

        const updatedTag = await response.json();
        setTags((prev) =>
          prev.map((t) =>
            t.id === tagId ? { ...t, ...updatedTag, highlightCount: t.highlightCount } : t
          )
        );
        toast.success('Tag updated');
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to update tag');
      } finally {
        setSavingTagId(null);
      }
    },
    [projectId]
  );

  // Create new tag via API
  const createTag = useCallback(async () => {
    if (!newTagName.trim()) {
      toast.error('Tag name is required');
      return;
    }

    setSavingTagId('new');
    try {
      const response = await fetch(`/api/projects/${projectId}/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newTagName.trim(),
          color: newTagColor,
          description: newTagDescription.trim() || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create tag');
      }

      const newTag = await response.json();
      setTags((prev) => [...prev, { ...newTag, highlightCount: 0 }]);
      setNewTagName('');
      setNewTagColor(TAG_COLORS[5]);
      setNewTagDescription('');
      setIsCreating(false);
      toast.success('Tag created');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create tag');
    } finally {
      setSavingTagId(null);
    }
  }, [projectId, newTagName, newTagColor, newTagDescription]);

  // Delete tag via API
  const deleteTag = useCallback(
    async (tagId: string) => {
      const tag = tags.find((t) => t.id === tagId);
      if (!tag) return;

      setSavingTagId(tagId);
      try {
        const response = await fetch(`/api/projects/${projectId}/tags/${tagId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to delete tag');
        }

        setTags((prev) => prev.filter((t) => t.id !== tagId));
        setDeleteConfirm(null);
        toast.success('Tag deleted');
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to delete tag');
      } finally {
        setSavingTagId(null);
      }
    },
    [projectId, tags]
  );

  // Handle starting edit
  const startEdit = (tag: Tag, field: 'name' | 'description') => {
    setEditingTagId(tag.id);
    setEditingField(field);
    setEditValue(field === 'name' ? tag.name : tag.description || '');
  };

  // Handle saving edit on blur or Enter
  const saveEdit = () => {
    if (!editingTagId || !editingField) return;

    const tag = tags.find((t) => t.id === editingTagId);
    if (!tag) return;

    const currentValue = editingField === 'name' ? tag.name : tag.description || '';
    const trimmedValue = editValue.trim();

    // Only save if value changed
    if (trimmedValue !== currentValue) {
      if (editingField === 'name' && !trimmedValue) {
        toast.error('Tag name cannot be empty');
        setEditValue(tag.name); // Reset to original
      } else {
        updateTag(editingTagId, {
          [editingField]: editingField === 'description' ? trimmedValue || null : trimmedValue,
        });
      }
    }

    setEditingTagId(null);
    setEditingField(null);
    setEditValue('');
  };

  // Handle key press in edit input
  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveEdit();
    } else if (e.key === 'Escape') {
      setEditingTagId(null);
      setEditingField(null);
      setEditValue('');
    }
  };

  // Handle key press in new tag input
  const handleNewTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      createTag();
    } else if (e.key === 'Escape') {
      setIsCreating(false);
      setNewTagName('');
      setNewTagColor(TAG_COLORS[5]);
      setNewTagDescription('');
    }
  };

  // Handle color change
  const handleColorChange = (tagId: string, color: string) => {
    // Optimistic update
    setTags((prev) => prev.map((t) => (t.id === tagId ? { ...t, color } : t)));
    setShowColorPicker(null);
    updateTag(tagId, { color });
  };

  return (
    <Card className="border-gray-800 bg-gray-900">
      <CardHeader className="cursor-pointer select-none" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-white">Project Tags</CardTitle>
            <CardDescription>
              Manage tags used for highlighting transcript segments ({tags.length} tags)
            </CardDescription>
          </div>
          <ChevronDown
            size={20}
            className={`text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
          />
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-4">
          {/* Tags List */}
          {tags.length === 0 && !isCreating && (
            <p className="py-4 text-center text-sm text-gray-500">
              No tags yet. Create your first tag to start highlighting.
            </p>
          )}

          <div className="space-y-3">
            {tags.map((tag) => (
              <div
                key={tag.id}
                className="group flex items-start gap-3 rounded-lg border border-gray-800 bg-gray-950 p-3"
              >
                {/* Color dot / picker */}
                <div className="relative">
                  <button
                    type="button"
                    className="mt-1 h-5 w-5 rounded-full transition-transform hover:scale-110"
                    style={{ backgroundColor: tag.color }}
                    onClick={() => setShowColorPicker(showColorPicker === tag.id ? null : tag.id)}
                    aria-label="Change color"
                  />
                  {showColorPicker === tag.id && (
                    <div className="absolute left-0 z-10 mt-2 rounded-lg border border-gray-700 bg-gray-900 p-3 shadow-lg">
                      <ColorPicker
                        colors={TAG_COLORS}
                        selectedColor={tag.color}
                        onColorChange={(color) => handleColorChange(tag.id, color)}
                        size="sm"
                        showCheckmark
                      />
                    </div>
                  )}
                </div>

                {/* Tag info */}
                <div className="min-w-0 flex-1">
                  {/* Name - inline edit */}
                  {editingTagId === tag.id && editingField === 'name' ? (
                    <Input
                      ref={inputRef}
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={saveEdit}
                      onKeyDown={handleEditKeyDown}
                      className={inputClass}
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="hover:text-accent-primary text-left font-medium text-white"
                        onClick={() => startEdit(tag, 'name')}
                      >
                        {tag.name}
                      </button>
                      <TagBadge
                        name={`${tag.highlightCount}`}
                        color={tag.color}
                        className="text-xs"
                      />
                    </div>
                  )}

                  {/* Description - inline edit */}
                  {editingTagId === tag.id && editingField === 'description' ? (
                    <Input
                      ref={inputRef}
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={saveEdit}
                      onKeyDown={handleEditKeyDown}
                      placeholder="Add description..."
                      className={`${inputClass} mt-1`}
                    />
                  ) : (
                    <button
                      type="button"
                      className="mt-1 block text-left text-sm text-gray-400 hover:text-gray-300"
                      onClick={() => startEdit(tag, 'description')}
                    >
                      {tag.description || 'Click to add description...'}
                    </button>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  {savingTagId === tag.id && (
                    <Loader2 size={16} className="animate-spin text-gray-400" />
                  )}

                  {deleteConfirm === tag.id ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-red-400">
                        Delete{tag.highlightCount > 0 ? ` (${tag.highlightCount} highlights)` : ''}?
                      </span>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteTag(tag.id)}
                        disabled={savingTagId === tag.id}
                        className="h-6 px-2 text-xs"
                      >
                        Yes
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteConfirm(null)}
                        className="h-6 px-2 text-xs"
                      >
                        No
                      </Button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="p-1 text-gray-500 opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-400"
                      onClick={() => setDeleteConfirm(tag.id)}
                      aria-label="Delete tag"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Create new tag form */}
          {isCreating ? (
            <div className="space-y-3 rounded-lg border border-gray-700 bg-gray-950 p-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-white">Tag Name *</label>
                <Input
                  ref={newTagInputRef}
                  type="text"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  onKeyDown={handleNewTagKeyDown}
                  placeholder="e.g., Pain Point"
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-white">Color</label>
                <ColorPicker
                  colors={TAG_COLORS}
                  selectedColor={newTagColor}
                  onColorChange={setNewTagColor}
                  size="sm"
                  showCheckmark
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-white">
                  Description (optional)
                </label>
                <Input
                  type="text"
                  value={newTagDescription}
                  onChange={(e) => setNewTagDescription(e.target.value)}
                  onKeyDown={handleNewTagKeyDown}
                  placeholder="Describe when to use this tag..."
                  className={inputClass}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsCreating(false);
                    setNewTagName('');
                    setNewTagColor(TAG_COLORS[5]);
                    setNewTagDescription('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={createTag}
                  disabled={savingTagId === 'new' || !newTagName.trim()}
                >
                  {savingTagId === 'new' ? (
                    <Loader2 size={16} className="mr-1 animate-spin" />
                  ) : (
                    <Plus size={16} className="mr-1" />
                  )}
                  Create Tag
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCreating(true)}
              className="w-full border-dashed border-gray-700 text-gray-400 hover:border-gray-600 hover:text-white"
            >
              <Plus size={16} className="mr-1" />
              Add New Tag
            </Button>
          )}
        </CardContent>
      )}
    </Card>
  );
}
