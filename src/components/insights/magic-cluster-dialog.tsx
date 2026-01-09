'use client';

import { useState } from 'react';
import { Sparkles, Loader2, AlertCircle, Check, Pencil, Square, CheckSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface SuggestedTheme {
  name: string;
  description: string | null;
  color: string;
  highlightIds: string[];
  confidence?: number;
}

interface MagicClusterDialogProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unassignedCount: number;
  onAccept: (themes: SuggestedTheme[]) => Promise<void>;
}

type DialogState = 'idle' | 'loading' | 'preview' | 'accepting' | 'error';

export function MagicClusterDialog({
  projectId,
  open,
  onOpenChange,
  unassignedCount,
  onAccept,
}: MagicClusterDialogProps) {
  const [state, setState] = useState<DialogState>('idle');
  const [themes, setThemes] = useState<SuggestedTheme[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');

  const handleOpen = async () => {
    setState('loading');
    setError(null);

    try {
      const res = await fetch(`/api/projects/${projectId}/themes/suggest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ minClusters: 3, maxClusters: 7 }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to suggest themes');
      }

      const data = await res.json();
      setThemes(data.themes);
      // Select all themes by default
      setSelected(new Set(data.themes.map((_: SuggestedTheme, i: number) => i)));
      setState('preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze highlights');
      setState('error');
    }
  };

  const handleAccept = async () => {
    const selectedThemes = themes.filter((_, i) => selected.has(i));
    if (selectedThemes.length === 0) return;

    setState('accepting');
    setError(null);

    try {
      await onAccept(selectedThemes);
      // Reset and close
      setState('idle');
      setThemes([]);
      setSelected(new Set());
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create themes');
      setState('error');
    }
  };

  const toggleSelection = (index: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === themes.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(themes.map((_, i) => i)));
    }
  };

  const handleClose = () => {
    setState('idle');
    setThemes([]);
    setSelected(new Set());
    setError(null);
    setEditingIndex(null);
    onOpenChange(false);
  };

  const handleStartEdit = (index: number) => {
    setEditingIndex(index);
    setEditingName(themes[index].name);
  };

  const handleSaveEdit = (index: number) => {
    if (editingName.trim()) {
      setThemes((prev) =>
        prev.map((t, i) => (i === index ? { ...t, name: editingName.trim() } : t))
      );
    }
    setEditingIndex(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Enter') {
      handleSaveEdit(index);
    } else if (e.key === 'Escape') {
      setEditingIndex(null);
    }
  };

  // Start loading when dialog opens
  if (open && state === 'idle') {
    handleOpen();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={state === 'loading' || state === 'accepting' ? undefined : handleClose}
      />

      {/* Dialog */}
      <div className="bg-card relative z-10 w-full max-w-lg rounded-lg border p-6 shadow-lg">
        {/* Loading State */}
        {state === 'loading' && (
          <div className="flex flex-col items-center py-12">
            <div className="relative mb-4">
              <Sparkles className="text-primary h-12 w-12 animate-pulse" />
              <Loader2 className="text-primary absolute -right-1 -bottom-1 h-5 w-5 animate-spin" />
            </div>
            <h2 className="mb-2 text-lg font-semibold">Analyzing Highlights</h2>
            <p className="text-muted-foreground text-sm">
              Finding patterns in {unassignedCount} highlights...
            </p>
          </div>
        )}

        {/* Error State */}
        {state === 'error' && (
          <div className="flex flex-col items-center py-8">
            <AlertCircle className="text-destructive mb-4 h-12 w-12" />
            <h2 className="mb-2 text-lg font-semibold">Analysis Failed</h2>
            <p className="text-muted-foreground mb-6 text-center text-sm">{error}</p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleOpen}>Try Again</Button>
            </div>
          </div>
        )}

        {/* Preview State */}
        {state === 'preview' && (
          <>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Sparkles className="text-primary h-6 w-6" />
                <div>
                  <h2 className="text-lg font-semibold">Suggested Themes</h2>
                  <p className="text-muted-foreground text-sm">
                    {themes.length} themes from{' '}
                    {themes.reduce((sum, t) => sum + t.highlightIds.length, 0)} highlights
                  </p>
                </div>
              </div>
              <button
                onClick={toggleAll}
                className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-sm"
              >
                {selected.size === themes.length ? (
                  <CheckSquare className="h-4 w-4" />
                ) : (
                  <Square className="h-4 w-4" />
                )}
                {selected.size === themes.length ? 'Deselect all' : 'Select all'}
              </button>
            </div>

            {/* Theme Cards */}
            <div className="mb-6 max-h-80 space-y-2 overflow-y-auto">
              {themes.map((theme, index) => (
                <div
                  key={index}
                  className={`group flex cursor-pointer items-center gap-3 rounded-lg p-3 transition-colors ${
                    selected.has(index) ? 'bg-muted/50' : 'bg-muted/20 opacity-60'
                  }`}
                  onClick={() => toggleSelection(index)}
                >
                  {/* Checkbox */}
                  <button
                    className="text-muted-foreground hover:text-foreground flex-shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSelection(index);
                    }}
                  >
                    {selected.has(index) ? (
                      <CheckSquare className="text-primary h-5 w-5" />
                    ) : (
                      <Square className="h-5 w-5" />
                    )}
                  </button>

                  {/* Color indicator */}
                  <div
                    className="h-10 w-2 flex-shrink-0 rounded-full"
                    style={{ backgroundColor: theme.color }}
                  />

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    {editingIndex === index ? (
                      <Input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, index)}
                        onBlur={() => handleSaveEdit(index)}
                        onClick={(e) => e.stopPropagation()}
                        className="h-7 text-sm font-medium"
                        autoFocus
                      />
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="truncate font-medium">{theme.name}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartEdit(index);
                          }}
                          className="text-muted-foreground hover:text-foreground opacity-0 transition-opacity group-hover:opacity-100"
                          title="Edit name"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                    {theme.description && (
                      <p className="text-muted-foreground mt-0.5 truncate text-xs">
                        {theme.description}
                      </p>
                    )}
                  </div>

                  {/* Highlight count */}
                  <div className="bg-background flex-shrink-0 rounded px-2 py-1 text-xs font-medium">
                    {theme.highlightIds.length} highlight
                    {theme.highlightIds.length !== 1 ? 's' : ''}
                  </div>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between">
              <p className="text-muted-foreground text-sm">
                {selected.size} of {themes.length} selected
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button onClick={handleAccept} disabled={selected.size === 0} className="gap-2">
                  <Check className="h-4 w-4" />
                  Accept {selected.size === themes.length ? 'All' : `(${selected.size})`}
                </Button>
              </div>
            </div>
          </>
        )}

        {/* Accepting State */}
        {state === 'accepting' && (
          <div className="flex flex-col items-center py-12">
            <Loader2 className="text-primary mb-4 h-12 w-12 animate-spin" />
            <h2 className="mb-2 text-lg font-semibold">Creating Themes</h2>
            <p className="text-muted-foreground text-sm">
              Setting up {selected.size} theme{selected.size !== 1 ? 's' : ''}...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
