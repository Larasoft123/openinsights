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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useVideoPlayerStore } from '@/lib/stores/video-player-store';
import { parseTimeString, formatTimeForInput } from '@/lib/utils/time';
import { useAsyncAction } from '@/lib/hooks/use-async-action';

interface SegmentCreateDialogProps {
  open: boolean;
  sourceId: string;
  onClose: () => void;
  onCreated: () => void;
}

export function SegmentCreateDialog({
  open,
  sourceId,
  onClose,
  onCreated,
}: SegmentCreateDialogProps) {
  const currentTime = useVideoPlayerStore((state) => state.currentTime);
  const { loading: saving, error, execute, clearError } = useAsyncAction();

  const [content, setContent] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [speakerId, setSpeakerId] = useState('');

  // Reset state and pre-fill startTime when dialog opens
  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional form reset on dialog open
      setContent('');

      setStartTime(formatTimeForInput(currentTime));

      setEndTime('');

      setSpeakerId('');
      clearError();
    }
  }, [open, currentTime, clearError]);

  const handleSave = () => {
    // Validate content
    if (!content.trim()) {
      return execute(
        async () => {
          throw new Error('Content is required');
        },
        () => {}
      );
    }

    // Parse and validate times
    const parsedStartTime = parseTimeString(startTime);
    const parsedEndTime = parseTimeString(endTime);

    if (parsedStartTime === null) {
      return execute(
        async () => {
          throw new Error('Invalid start time format (use MM:SS or seconds)');
        },
        () => {}
      );
    }

    if (parsedEndTime === null) {
      return execute(
        async () => {
          throw new Error('Invalid end time format (use MM:SS or seconds)');
        },
        () => {}
      );
    }

    if (parsedEndTime <= parsedStartTime) {
      return execute(
        async () => {
          throw new Error('End time must be after start time');
        },
        () => {}
      );
    }

    execute(
      async () => {
        const res = await fetch(`/api/sources/${sourceId}/segments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: content.trim(),
            startTime: parsedStartTime,
            endTime: parsedEndTime,
            speakerId: speakerId.trim() || undefined,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to create segment');
        }
      },
      () => {
        onCreated();
        onClose();
      }
    );
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add Transcript Segment</DialogTitle>
          <DialogDescription>
            Create a new segment for content that was missed by the transcriber.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {/* Time inputs */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="start-time" className="text-sm font-medium">
                Start Time
              </label>
              <Input
                id="start-time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                placeholder="0:00"
                className="mt-1.5"
              />
              <p className="text-muted-foreground mt-1 text-xs">Format: MM:SS or seconds</p>
            </div>
            <div>
              <label htmlFor="end-time" className="text-sm font-medium">
                End Time
              </label>
              <Input
                id="end-time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                placeholder="0:00"
                className="mt-1.5"
              />
              <p className="text-muted-foreground mt-1 text-xs">Format: MM:SS or seconds</p>
            </div>
          </div>

          {/* Content */}
          <div>
            <label htmlFor="segment-content" className="text-sm font-medium">
              Content
            </label>
            <Textarea
              id="segment-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Enter the transcript text"
              className="mt-1.5 min-h-[100px]"
              rows={4}
            />
          </div>

          {/* Speaker ID (optional) */}
          <div>
            <label htmlFor="speaker-id" className="text-sm font-medium">
              Speaker ID (optional)
            </label>
            <Input
              id="speaker-id"
              value={speakerId}
              onChange={(e) => setSpeakerId(e.target.value)}
              placeholder="e.g., Speaker 1"
              className="mt-1.5"
            />
          </div>

          {error && <p className="text-destructive text-sm">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !content.trim()}>
            {saving ? 'Creating...' : 'Create Segment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
