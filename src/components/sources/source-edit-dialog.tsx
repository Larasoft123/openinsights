'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

interface SourceEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceId: string;
  sourceTitle: string;
  projectId: string;
  onSaved: (newTitle: string) => void;
}

export function SourceEditDialog({
  open,
  onOpenChange,
  sourceId,
  sourceTitle,
  projectId,
  onSaved,
}: SourceEditDialogProps) {
  const [title, setTitle] = useState(sourceTitle);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/projects/${projectId}/sources/${sourceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update source');
      }

      onSaved(title.trim());
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update source');
    } finally {
      setSaving(false);
    }
  };

  // Reset state when dialog opens
  const handleOpenChange = (open: boolean) => {
    if (open) {
      setTitle(sourceTitle);
      setError(null);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Source Name</DialogTitle>
          <DialogDescription>Change the display name for this source.</DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <label htmlFor="source-title" className="text-sm font-medium">
            Title
          </label>
          <Input
            id="source-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter source title"
            className="mt-1.5"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSave();
              }
            }}
          />
          {error && <p className="text-destructive mt-2 text-sm">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !title.trim()}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
