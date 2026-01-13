'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Plus, FolderKanban, Users, ChevronRight, Trash2, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import { WorkspaceMembers } from './workspace-members';
import { MetadataFieldsManager } from '@/components/metadata';

interface Workspace {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
  memberCount: number;
  projectCount: number;
  userRole: 'owner' | 'editor' | 'viewer';
}

interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  role: 'owner' | 'editor' | 'viewer';
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
}

interface WorkspacesListProps {
  currentUserId: string;
}

const ROLE_COLORS = {
  owner: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  editor: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  viewer: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
};

export function WorkspacesList({ currentUserId }: WorkspacesListProps) {
  const searchParams = useSearchParams();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedWorkspace, setExpandedWorkspace] = useState<string | null>(null);
  const [workspaceMembers, setWorkspaceMembers] = useState<Record<string, WorkspaceMember[]>>({});
  const [initialExpandHandled, setInitialExpandHandled] = useState(false);

  // Create workspace dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Edit workspace dialog
  const [editWorkspace, setEditWorkspace] = useState<Workspace | null>(null);
  const [editName, setEditName] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Delete workspace dialog
  const [deleteWorkspace, setDeleteWorkspace] = useState<Workspace | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchWorkspaces = useCallback(async () => {
    try {
      const response = await fetch('/api/workspaces');
      if (response.ok) {
        const data = await response.json();
        setWorkspaces(data);
      }
    } catch (error) {
      console.error('Failed to fetch workspaces:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchWorkspaceMembers = useCallback(async (workspaceId: string) => {
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/members`);
      if (response.ok) {
        const data = await response.json();
        setWorkspaceMembers((prev) => ({ ...prev, [workspaceId]: data }));
      }
    } catch (error) {
      console.error('Failed to fetch workspace members:', error);
    }
  }, []);

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  // Auto-expand workspace from URL query param (e.g., ?expand=workspaceId)
  useEffect(() => {
    if (initialExpandHandled || isLoading || workspaces.length === 0) return;

    const expandId = searchParams.get('expand');
    if (expandId) {
      // Check if this workspace exists in the list
      const workspaceExists = workspaces.some((w) => w.id === expandId);
      if (workspaceExists) {
        setExpandedWorkspace(expandId);
        // Fetch members for this workspace
        if (!workspaceMembers[expandId]) {
          fetchWorkspaceMembers(expandId);
        }
      }
    }
    setInitialExpandHandled(true);
  }, [
    searchParams,
    workspaces,
    isLoading,
    initialExpandHandled,
    workspaceMembers,
    fetchWorkspaceMembers,
  ]);

  const handleToggleWorkspace = (workspaceId: string) => {
    if (expandedWorkspace === workspaceId) {
      setExpandedWorkspace(null);
    } else {
      setExpandedWorkspace(workspaceId);
      if (!workspaceMembers[workspaceId]) {
        fetchWorkspaceMembers(workspaceId);
      }
    }
  };

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    setCreateError(null);

    try {
      const response = await fetch('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: createName }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create workspace');
      }

      setCreateName('');
      setCreateOpen(false);
      fetchWorkspaces();
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : 'Failed to create workspace');
    } finally {
      setIsCreating(false);
    }
  };

  const handleEditWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editWorkspace) return;

    setIsEditing(true);
    setEditError(null);

    try {
      const response = await fetch(`/api/workspaces/${editWorkspace.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update workspace');
      }

      setEditWorkspace(null);
      fetchWorkspaces();
    } catch (error) {
      setEditError(error instanceof Error ? error.message : 'Failed to update workspace');
    } finally {
      setIsEditing(false);
    }
  };

  const handleDeleteWorkspace = async () => {
    if (!deleteWorkspace) return;

    setIsDeleting(true);

    try {
      const response = await fetch(`/api/workspaces/${deleteWorkspace.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete workspace');
      }

      setDeleteWorkspace(null);
      fetchWorkspaces();
    } catch (error) {
      console.error('Failed to delete workspace:', error);
      alert(error instanceof Error ? error.message : 'Failed to delete workspace');
    } finally {
      setIsDeleting(false);
    }
  };

  const openEditDialog = (workspace: Workspace) => {
    setEditWorkspace(workspace);
    setEditName(workspace.name);
    setEditError(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Create Workspace Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Workspaces</CardTitle>
              <CardDescription>
                Workspaces help you organize projects and manage team access
              </CardDescription>
            </div>
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  New Workspace
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Create Workspace</DialogTitle>
                  <DialogDescription>
                    Create a new workspace to organize your projects.
                  </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleCreateWorkspace} className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="name" className="text-sm font-medium">
                      Workspace Name
                    </label>
                    <Input
                      id="name"
                      value={createName}
                      onChange={(e) => setCreateName(e.target.value)}
                      placeholder="My Workspace"
                      required
                    />
                  </div>

                  {createError && <p className="text-sm text-red-500">{createError}</p>}

                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setCreateOpen(false)}
                      disabled={isCreating}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isCreating || !createName}>
                      {isCreating ? 'Creating...' : 'Create'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {workspaces.length === 0 ? (
            <div className="py-8 text-center">
              <FolderKanban className="mx-auto h-12 w-12 text-gray-600" />
              <h3 className="mt-4 text-lg font-medium text-white">No workspaces yet</h3>
              <p className="mt-2 text-sm text-gray-400">
                Create your first workspace to start organizing projects.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {workspaces.map((workspace) => {
                const isExpanded = expandedWorkspace === workspace.id;
                return (
                  <div
                    key={workspace.id}
                    className="rounded-lg border border-gray-800 bg-gray-900/50"
                  >
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => handleToggleWorkspace(workspace.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleToggleWorkspace(workspace.id);
                        }
                      }}
                      className="flex w-full cursor-pointer items-center justify-between p-4 hover:bg-gray-800/50"
                    >
                      <div className="flex items-center gap-3">
                        <ChevronRight
                          className={`h-4 w-4 text-gray-500 transition-transform ${
                            isExpanded ? 'rotate-90' : ''
                          }`}
                        />
                        <FolderKanban className="h-5 w-5 text-gray-400" />
                        <div className="text-left">
                          <h3 className="font-medium text-white">{workspace.name}</h3>
                          <div className="flex items-center gap-3 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {workspace.memberCount} members
                            </span>
                            <span>{workspace.projectCount} projects</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={`text-xs ${ROLE_COLORS[workspace.userRole]}`}
                        >
                          {workspace.userRole}
                        </Badge>

                        {workspace.userRole === 'owner' && (
                          <div
                            className="flex items-center gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => openEditDialog(workspace)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-400 hover:text-red-300"
                              onClick={() => setDeleteWorkspace(workspace)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-gray-800 p-4">
                        <h4 className="mb-3 text-sm font-medium text-gray-400">Members</h4>
                        <WorkspaceMembers
                          workspaceId={workspace.id}
                          members={workspaceMembers[workspace.id] || []}
                          currentUserId={currentUserId}
                          currentUserRole={workspace.userRole}
                          onMemberUpdated={() => {
                            fetchWorkspaceMembers(workspace.id);
                            fetchWorkspaces();
                          }}
                        />

                        {/* Project Custom Fields - only for owners/editors */}
                        {(workspace.userRole === 'owner' || workspace.userRole === 'editor') && (
                          <div className="mt-6">
                            <MetadataFieldsManager
                              entityType="PROJECT"
                              parentId={workspace.id}
                              title="Project Custom Fields"
                              description="Define custom fields for all projects in this workspace"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Workspace Dialog */}
      <Dialog open={!!editWorkspace} onOpenChange={() => setEditWorkspace(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Workspace</DialogTitle>
            <DialogDescription>Update workspace details.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditWorkspace} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="editName" className="text-sm font-medium">
                Workspace Name
              </label>
              <Input
                id="editName"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="My Workspace"
                required
              />
            </div>

            {editError && <p className="text-sm text-red-500">{editError}</p>}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditWorkspace(null)}
                disabled={isEditing}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isEditing || !editName}>
                {isEditing ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Workspace Dialog */}
      <AlertDialog open={!!deleteWorkspace} onOpenChange={() => setDeleteWorkspace(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Workspace</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteWorkspace?.name}</strong>? This will
              permanently delete all projects and data in this workspace. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteWorkspace}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
