/**
 * Project Actions Dropdown Component
 *
 * Reusable dropdown menu for project actions (edit, archive, restore, delete).
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { MoreVertical, Pencil, Archive, RotateCcw, Trash2 } from 'lucide-react';
import { EditProjectDialog } from './edit-project-dialog';
import { ArchiveProjectDialog } from './archive-project-dialog';
import { RestoreProjectDialog } from './restore-project-dialog';
import { DeleteProjectDialog } from './delete-project-dialog';

interface ProjectActionsDropdownProps {
  project: {
    id: string;
    name: string;
    description: string | null;
    archivedAt: Date | null;
  };
  /** Variant controls button styling */
  variant?: 'card' | 'header';
  /** If true, redirect to /projects after archiving (useful when in project detail) */
  redirectAfterArchive?: boolean;
}

export function ProjectActionsDropdown({
  project,
  variant = 'card',
  redirectAfterArchive = false,
}: ProjectActionsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isArchived = !!project.archivedAt;

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Stop propagation to prevent card click when clicking dropdown
  const handleButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  const handleAction = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    setIsOpen(false);
    action();
  };

  const buttonClass =
    variant === 'card'
      ? 'absolute top-4 right-4 z-10 rounded-lg p-2 text-white/70 transition-all hover:bg-black/30 hover:text-white opacity-0 group-hover:opacity-100'
      : 'rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white';

  return (
    <div ref={dropdownRef} className="relative">
      {/* Trigger Button */}
      <button
        onClick={handleButtonClick}
        className={buttonClass}
        aria-label="Project actions"
        aria-expanded={isOpen}
      >
        <MoreVertical size={20} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full right-0 z-20 mt-1 min-w-[160px] overflow-hidden rounded-lg border border-gray-800 bg-gray-900 shadow-xl">
          {/* Edit - always available */}
          <button
            onClick={(e) => handleAction(e, () => setEditDialogOpen(true))}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-gray-300 transition-colors hover:bg-gray-800 hover:text-white"
          >
            <Pencil size={16} />
            Edit
          </button>

          {/* Archive/Restore based on state */}
          {isArchived ? (
            <button
              onClick={(e) => handleAction(e, () => setRestoreDialogOpen(true))}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-green-400 transition-colors hover:bg-gray-800 hover:text-green-300"
            >
              <RotateCcw size={16} />
              Restore
            </button>
          ) : (
            <button
              onClick={(e) => handleAction(e, () => setArchiveDialogOpen(true))}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-amber-400 transition-colors hover:bg-gray-800 hover:text-amber-300"
            >
              <Archive size={16} />
              Archive
            </button>
          )}

          {/* Delete - only for archived projects */}
          {isArchived && (
            <>
              <div className="mx-2 border-t border-gray-800" />
              <button
                onClick={(e) => handleAction(e, () => setDeleteDialogOpen(true))}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-red-400 transition-colors hover:bg-gray-800 hover:text-red-300"
              >
                <Trash2 size={16} />
                Delete Forever
              </button>
            </>
          )}
        </div>
      )}

      {/* Dialogs */}
      <EditProjectDialog
        isOpen={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        project={project}
      />
      <ArchiveProjectDialog
        isOpen={archiveDialogOpen}
        onClose={() => setArchiveDialogOpen(false)}
        project={project}
        redirectAfterArchive={redirectAfterArchive}
      />
      <RestoreProjectDialog
        isOpen={restoreDialogOpen}
        onClose={() => setRestoreDialogOpen(false)}
        project={project}
      />
      <DeleteProjectDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        project={project}
      />
    </div>
  );
}
