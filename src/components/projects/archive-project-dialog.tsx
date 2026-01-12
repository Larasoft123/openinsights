/**
 * Archive Project Dialog Component
 *
 * Confirmation dialog for archiving a project.
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, Archive } from 'lucide-react';

interface ArchiveProjectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  project: {
    id: string;
    name: string;
  };
  /** If true, navigates to /projects after successful archive */
  redirectAfterArchive?: boolean;
}

export function ArchiveProjectDialog({
  isOpen,
  onClose,
  project,
  redirectAfterArchive = false,
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
      router.refresh();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to archive project');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Dialog */}
      <div className="fixed top-1/2 left-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 px-4">
        <div className="overflow-hidden rounded-2xl border border-gray-800 bg-gray-900 shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-800 p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-amber-500/10 p-2">
                <Archive size={20} className="text-amber-500" />
              </div>
              <h2 className="text-xl font-semibold text-white">Archive Project</h2>
            </div>
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
              Are you sure you want to archive{' '}
              <strong className="text-white">{project.name}</strong>?
            </p>
            <p className="mt-2 text-sm text-gray-500">
              Archived projects are hidden from your main view but can be restored at any time.
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
                onClick={handleArchive}
                disabled={isSubmitting}
                className="flex-1 rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? 'Archiving...' : 'Archive Project'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
