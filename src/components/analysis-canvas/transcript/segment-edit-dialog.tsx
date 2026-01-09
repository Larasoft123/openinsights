'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

interface TranscriptSegmentData {
  id: string;
  content: string;
  startTime: number;
  endTime: number;
  speakerId: string | null;
  highlights?: Array<{
    id: string;
    tag: { id: string; name: string; color: string };
  }>;
}

interface SegmentEditDialogProps {
  segment: TranscriptSegmentData | null;
  sourceId: string;
  onClose: () => void;
  onSaved: () => void;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function SegmentEditDialog({ segment, sourceId, onClose, onSaved }: SegmentEditDialogProps) {
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state when segment changes
  useEffect(() => {
    if (segment) {
      setContent(segment.content);
      setError(null);
    }
  }, [segment]);

  const handleSave = async () => {
    if (!segment) return;

    if (!content.trim()) {
      setError('Content is required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/sources/${sourceId}/segments/${segment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: content.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update segment');
      }

      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update segment');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
    }
  };

  const hasChanged = segment && content.trim() !== segment.content;

  return (
    <Dialog open={!!segment} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edit Transcript Segment</DialogTitle>
          <DialogDescription>
            {segment && (
              <span className="text-muted-foreground">
                {formatTime(segment.startTime)} - {formatTime(segment.endTime)}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <label htmlFor="segment-content" className="text-sm font-medium">
            Content
          </label>
          <Textarea
            id="segment-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Enter segment content"
            className="mt-1.5 min-h-[120px]"
            rows={5}
          />
          {error && <p className="text-destructive mt-2 text-sm">{error}</p>}
          {hasChanged && (
            <p className="text-muted-foreground mt-2 text-sm">
              Search index will be updated in the background after saving.
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !content.trim()}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
