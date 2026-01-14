'use client';

import { useState } from 'react';
import { MoreHorizontal, Crown, Edit3, Eye, Trash2, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { getAvatarUrl } from '@/lib/utils/avatar';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

interface WorkspaceMembersProps {
  workspaceId: string;
  members: WorkspaceMember[];
  currentUserId: string;
  currentUserRole: 'owner' | 'editor' | 'viewer';
  onMemberUpdated: () => void;
}

const ROLE_ICONS = {
  owner: Crown,
  editor: Edit3,
  viewer: Eye,
};

const ROLE_COLORS = {
  owner: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  editor: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  viewer: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
};

export function WorkspaceMembers({
  workspaceId,
  members,
  currentUserId,
  currentUserRole,
  onMemberUpdated,
}: WorkspaceMembersProps) {
  const [memberToRemove, setMemberToRemove] = useState<WorkspaceMember | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('editor');
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const isOwner = currentUserRole === 'owner';

  const handleRoleChange = async (memberId: string, newRole: 'owner' | 'editor' | 'viewer') => {
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/members/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update role');
      }

      onMemberUpdated();
    } catch (error) {
      console.error('Failed to update role:', error);
      alert(error instanceof Error ? error.message : 'Failed to update role');
    }
  };

  const handleRemoveMember = async () => {
    if (!memberToRemove) return;

    setIsRemoving(true);
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/members/${memberToRemove.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to remove member');
      }

      onMemberUpdated();
    } catch (error) {
      console.error('Failed to remove member:', error);
      alert(error instanceof Error ? error.message : 'Failed to remove member');
    } finally {
      setIsRemoving(false);
      setMemberToRemove(null);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsInviting(true);
    setInviteError(null);

    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add member');
      }

      setInviteEmail('');
      setInviteRole('editor');
      setInviteOpen(false);
      onMemberUpdated();
    } catch (error) {
      setInviteError(error instanceof Error ? error.message : 'Failed to add member');
    } finally {
      setIsInviting(false);
    }
  };

  return (
    <>
      <div className="space-y-4">
        {/* Header with invite button */}
        {isOwner && (
          <div className="flex justify-end">
            <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add Member
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Add Workspace Member</DialogTitle>
                  <DialogDescription>
                    Add a user to this workspace. They must already have an account.
                  </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleInvite} className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="email" className="text-sm font-medium">
                      Email Address
                    </label>
                    <Input
                      id="email"
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="colleague@example.com"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="role" className="text-sm font-medium">
                      Role
                    </label>
                    <Select
                      value={inviteRole}
                      onValueChange={(v) => setInviteRole(v as 'editor' | 'viewer')}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="editor">
                          <div className="flex flex-col">
                            <span className="font-medium">Editor</span>
                            <span className="text-xs text-gray-500">Can view and edit content</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="viewer">
                          <div className="flex flex-col">
                            <span className="font-medium">Viewer</span>
                            <span className="text-xs text-gray-500">Read-only access</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {inviteError && <p className="text-sm text-red-500">{inviteError}</p>}

                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setInviteOpen(false)}
                      disabled={isInviting}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isInviting || !inviteEmail}>
                      {isInviting ? 'Adding...' : 'Add Member'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        )}

        {/* Members list */}
        <div className="divide-y divide-gray-800 rounded-lg border border-gray-800">
          {members.map((member) => {
            const RoleIcon = ROLE_ICONS[member.role];
            const isCurrentUser = member.userId === currentUserId;
            const canManage = isOwner && !isCurrentUser;

            return (
              <div key={member.id} className="flex items-center justify-between p-3">
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-blue-600 to-purple-600 text-sm font-medium text-white">
                    {getAvatarUrl(member.user.image, member.user.id) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={getAvatarUrl(member.user.image, member.user.id)!}
                        alt={member.user.name || 'User'}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      member.user.name?.charAt(0).toUpperCase() ||
                      member.user.email.charAt(0).toUpperCase()
                    )}
                  </div>

                  {/* Info */}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">
                        {member.user.name || member.user.email}
                      </span>
                      {isCurrentUser && <span className="text-xs text-gray-500">(you)</span>}
                    </div>
                    <p className="text-xs text-gray-400">{member.user.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Role badge */}
                  <Badge
                    variant="outline"
                    className={`flex items-center gap-1 text-xs ${ROLE_COLORS[member.role]}`}
                  >
                    <RoleIcon className="h-3 w-3" />
                    {member.role}
                  </Badge>

                  {/* Actions dropdown */}
                  {canManage && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => handleRoleChange(member.id, 'owner')}
                          disabled={member.role === 'owner'}
                        >
                          <Crown className="mr-2 h-4 w-4 text-yellow-500" />
                          Make Owner
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleRoleChange(member.id, 'editor')}
                          disabled={member.role === 'editor'}
                        >
                          <Edit3 className="mr-2 h-4 w-4 text-blue-500" />
                          Make Editor
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleRoleChange(member.id, 'viewer')}
                          disabled={member.role === 'viewer'}
                        >
                          <Eye className="mr-2 h-4 w-4 text-gray-400" />
                          Make Viewer
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setMemberToRemove(member)}
                          className="text-red-400 focus:text-red-400"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Remove
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            );
          })}

          {members.length === 0 && (
            <div className="p-6 text-center text-gray-500">No members found</div>
          )}
        </div>
      </div>

      {/* Remove confirmation dialog */}
      <AlertDialog open={!!memberToRemove} onOpenChange={() => setMemberToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove{' '}
              <strong>{memberToRemove?.user.name || memberToRemove?.user.email}</strong> from this
              workspace? They will lose access to all projects in this workspace.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRemoving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveMember}
              disabled={isRemoving}
              className="bg-red-600 hover:bg-red-700"
            >
              {isRemoving ? 'Removing...' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
