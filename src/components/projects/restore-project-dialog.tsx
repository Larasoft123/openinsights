/**
 * Restore Project Dialog Component
 *
 * Confirmation dialog for restoring an archived project.
 */

'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { X, RotateCcw } from 'lucide-react';

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

  if (!isOpen) return null;

  // Use portal to render at document body level to avoid overflow issues
  if (typeof document === 'undefined') return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Dialog */}
      <div className="fixed top-1/2 left-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 px-4">
        <div className="overflow-hidden rounded-2xl border border-gray-800 bg-gray-900 shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-800 p-6">
            <h2 className="text-xl font-semibold text-white">Restore Project</h2>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            <p className="text-gray-300">
              Are you sure you want to restore{' '}
              <strong className="text-white">{project.name}</strong>?
            </p>
            <p className="mt-2 text-sm text-gray-500">
              The project will be moved back to your active projects.
            </p>

            {/* Error Message */}
            {error && (
              <div className="mt-4 rounded-lg border border-red-900 bg-red-950/50 p-3 text-sm text-red-400">
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="mt-6 flex gap-3">
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
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
