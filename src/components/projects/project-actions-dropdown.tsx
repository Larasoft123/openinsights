/**
 * Project Actions Dropdown Component
 *
 * Reusable dropdown menu for project actions (edit, archive, restore, delete).
 */

'use client';

import { useState } from 'react';
import { MoreVertical, Pencil, Archive, RotateCcw, Trash2 } from 'lucide-react';
import { EditProjectDialog } from './edit-project-dialog';
import { ArchiveProjectDialog } from './archive-project-dialog';
import { RestoreProjectDialog } from './restore-project-dialog';
import { DeleteProjectDialog } from './delete-project-dialog';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

interface ProjectActionsDropdownProps {
  project: {
    id: string;
    name: string;
    description: string | null;
    language: string;
    archivedAt: Date | null;
    workspaceId?: string; // Optional - enables custom fields in edit dialog
    // Project Settings
    projectType?: string | null;
    goals?: string | null;
    context?: string | null;
    deadline?: string | Date | null;
    stakeholder?: string | null;
    researchQuestions?: string | null;
    targetParticipants?: number | null;
    recruitmentCriteria?: string | null;
  };
  /** Variant controls button styling */
  variant?: 'card' | 'header';
  /** If true, redirect to /projects after archiving (useful when in project detail) */
  redirectAfterArchive?: boolean;
  /** Callback fired after successful action - use to refresh data */
  onSuccess?: () => void;
}

export function ProjectActionsDropdown({
  project,
  variant = 'card',
  redirectAfterArchive = false,
  onSuccess,
}: ProjectActionsDropdownProps) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const isArchived = !!project.archivedAt;

  const buttonClass =
    variant === 'card'
      ? 'absolute top-4 right-4 z-10 rounded-lg p-2 text-white/70 transition-all hover:bg-black/30 hover:text-white opacity-0 group-hover:opacity-100'
      : 'rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white';

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            onClick={(e) => e.stopPropagation()}
            className={buttonClass}
            aria-label="Project actions"
          >
            <MoreVertical size={20} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[160px]">
          {/* Edit - always available */}
          <DropdownMenuItem onClick={() => setEditDialogOpen(true)}>
            <Pencil size={16} />
            Edit
          </DropdownMenuItem>

          {/* Archive/Restore based on state */}
          {isArchived ? (
            <DropdownMenuItem
              onClick={() => setRestoreDialogOpen(true)}
              className="text-green-400 hover:text-green-300 focus:text-green-300"
            >
              <RotateCcw size={16} />
              Restore
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              onClick={() => setArchiveDialogOpen(true)}
              className="text-amber-400 hover:text-amber-300 focus:text-amber-300"
            >
              <Archive size={16} />
              Archive
            </DropdownMenuItem>
          )}

          {/* Delete - only for archived projects */}
          {isArchived && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setDeleteDialogOpen(true)} variant="destructive">
                <Trash2 size={16} />
                Delete Forever
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Dialogs */}
      <EditProjectDialog
        isOpen={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        project={project}
        onSuccess={onSuccess}
      />
      <ArchiveProjectDialog
        isOpen={archiveDialogOpen}
        onClose={() => setArchiveDialogOpen(false)}
        project={project}
        redirectAfterArchive={redirectAfterArchive}
        onSuccess={onSuccess}
      />
      <RestoreProjectDialog
        isOpen={restoreDialogOpen}
        onClose={() => setRestoreDialogOpen(false)}
        project={project}
        onSuccess={onSuccess}
      />
      <DeleteProjectDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        project={project}
      />
    </>
  );
}
