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

interface SourceTrashDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceId: string;
  sourceTitle: string;
  projectId: string;
  onTrashed: () => void;
}

export function SourceTrashDialog({
  open,
  onOpenChange,
  sourceId,
  sourceTitle,
  projectId,
  onTrashed,
}: SourceTrashDialogProps) {
  const [loading, setLoading] = useState(false);

  const handleTrash = async () => {
    setLoading(true);

    try {
      const res = await fetch(`/api/projects/${projectId}/sources/${sourceId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to move source to trash');
      }

      onTrashed();
      onOpenChange(false);
    } catch (err) {
      console.error('Failed to trash source:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Move to Trash?</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <span className="text-foreground block font-medium">&quot;{sourceTitle}&quot;</span>
            <span className="block">You can restore this source from the Trash at any time.</span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleTrash}
            disabled={loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? 'Moving...' : 'Move to Trash'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
