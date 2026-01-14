/**
 * Delete Project Dialog Component
 *
 * Confirmation dialog for permanently deleting an archived project.
 * Requires typing the project name to confirm deletion.
 * Uses Shadcn Dialog for consistent UX, accessibility, and ESC key handling.
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface DeleteProjectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  project: {
    id: string;
    name: string;
  };
}

export function DeleteProjectDialog({ isOpen, onClose, project }: DeleteProjectDialogProps) {
  const router = useRouter();
  const [confirmName, setConfirmName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      setConfirmName('');
      setError(null);
    }
  }, [isOpen]);

  const handleDelete = async () => {
    if (confirmName !== project.name) {
      setError('Project name does not match');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmName }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete project');
      }

      router.push('/projects');
      router.refresh();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete project');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isNameMatch = confirmName === project.name;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-red-500/10 p-2">
              <Trash2 size={20} className="text-red-500" />
            </div>
            <DialogTitle>Delete Project</DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Warning */}
          <div className="flex items-start gap-3 rounded-lg border border-red-900 bg-red-950/30 p-4">
            <AlertTriangle size={20} className="mt-0.5 shrink-0 text-red-500" />
            <div>
              <p className="font-medium text-red-400">This action cannot be undone</p>
              <p className="mt-1 text-sm text-red-400/80">
                This will permanently delete the project, all sources, transcripts, highlights, and
                any other associated data.
              </p>
            </div>
          </div>

          <p className="text-gray-300">
            To confirm deletion, type the project name:{' '}
            <strong className="text-white">{project.name}</strong>
          </p>

          {/* Confirmation Input */}
          <input
            type="text"
            value={confirmName}
            onChange={(e) => setConfirmName(e.target.value)}
            placeholder="Type project name to confirm"
            className="w-full rounded-lg border border-gray-800 bg-gray-950 px-4 py-2.5 text-white placeholder-gray-500 transition-colors outline-none focus:border-red-500"
            autoFocus
          />

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
            onClick={handleDelete}
            disabled={isSubmitting || !isNameMatch}
            className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? 'Deleting...' : 'Delete Forever'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
