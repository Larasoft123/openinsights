'use client';

import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

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

interface SegmentDeleteDialogProps {
  segment: TranscriptSegmentData | null;
  sourceId: string;
  onClose: () => void;
  onDeleted: () => void;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function SegmentDeleteDialog({
  segment,
  sourceId,
  onClose,
  onDeleted,
}: SegmentDeleteDialogProps) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!segment) return;

    setLoading(true);

    try {
      const res = await fetch(`/api/sources/${sourceId}/segments/${segment.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete segment');
      }

      onDeleted();
      onClose();
    } catch (err) {
      console.error('Failed to delete segment:', err);
    } finally {
      setLoading(false);
    }
  };

  const highlightCount = segment?.highlights?.length || 0;
  const truncatedContent =
    segment && segment.content.length > 100
      ? segment.content.slice(0, 100) + '...'
      : segment?.content;

  return (
    <AlertDialog open={!!segment} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Segment?</AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            {segment && (
              <>
                <span className="text-muted-foreground block text-xs">
                  {formatTime(segment.startTime)} - {formatTime(segment.endTime)}
                </span>
                <span className="text-foreground bg-muted block rounded p-2 text-sm">
                  &quot;{truncatedContent}&quot;
                </span>
                {highlightCount > 0 && (
                  <span className="text-destructive block text-sm">
                    This will also delete {highlightCount} highlight
                    {highlightCount > 1 ? 's' : ''} on this segment.
                  </span>
                )}
                <span className="block text-sm">This action cannot be undone.</span>
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
