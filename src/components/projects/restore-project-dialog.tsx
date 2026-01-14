/**
 * Restore Project Dialog Component
 *
 * Confirmation dialog for restoring an archived project.
 * Uses Shadcn Dialog for consistent UX, accessibility, and ESC key handling.
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface RestoreProjectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  project: {
    id: string;
    name: string;
  };
  /** Callback fired after successful restore - use to refresh data */
  onSuccess?: () => void;
}

export function RestoreProjectDialog({
  isOpen,
  onClose,
  project,
  onSuccess,
}: RestoreProjectDialogProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRestore = async () => {
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/projects/${project.id}/restore`, {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to restore project');
      }

      onClose();
      onSuccess?.();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to restore project');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Restore Project</DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          <p className="text-gray-300">
            Are you sure you want to restore <strong className="text-white">{project.name}</strong>?
          </p>
          <p className="text-sm text-gray-500">
            The project will be moved back to your active projects.
          </p>

          {/* Error Message */}
          {error && (
            <div className="rounded-lg border border-red-900 bg-red-950/50 p-3 text-sm text-red-400">
              {error}
            </div>
          )}
        </div>

        <DialogFooter className="gap-3 sm:gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-gray-800 bg-gray-950 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleRestore}
            disabled={isSubmitting}
            className="bg-accent-primary hover:bg-accent-primary/90 flex-1 rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? 'Restoring...' : 'Restore Project'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
