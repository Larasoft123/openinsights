/**
 * Archive Project Dialog Component
 *
 * Confirmation dialog for archiving a project.
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

interface ArchiveProjectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  project: {
    id: string;
    name: string;
  };
  /** If true, navigates to /projects after successful archive */
  redirectAfterArchive?: boolean;
  /** Callback fired after successful archive - use to refresh data */
  onSuccess?: () => void;
}

export function ArchiveProjectDialog({
  isOpen,
  onClose,
  project,
  redirectAfterArchive = false,
  onSuccess,
}: ArchiveProjectDialogProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleArchive = async () => {
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/projects/${project.id}/archive`, {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to archive project');
      }

      if (redirectAfterArchive) {
        router.push('/projects');
      }
      onClose();
      onSuccess?.();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to archive project');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Archive Project</DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          <p className="text-gray-300">
            Are you sure you want to archive <strong className="text-white">{project.name}</strong>?
          </p>
          <p className="text-sm text-gray-500">
            Archived projects are hidden from your main view but can be restored at any time.
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
            onClick={handleArchive}
            disabled={isSubmitting}
            className="bg-accent-primary hover:bg-accent-primary/90 flex-1 rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? 'Archiving...' : 'Archive Project'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
