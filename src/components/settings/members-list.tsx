'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { MoreHorizontal, Shield, ShieldCheck, Crown, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getAvatarUrl } from '@/lib/utils/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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

interface Member {
  id: string;
  userId: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
  invitedAt: string;
  joinedAt: string | null;
  isPending: boolean;
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
}

interface MembersListProps {
  members: Member[];
  currentUserId: string;
  currentUserRole: 'OWNER' | 'ADMIN' | 'MEMBER';
  onMemberUpdated: () => void;
}

const ROLE_ICONS = {
  OWNER: Crown,
  ADMIN: ShieldCheck,
  MEMBER: Shield,
};

const ROLE_COLORS = {
  OWNER: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  ADMIN: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  MEMBER: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
};

export function MembersList({
  members,
  currentUserId,
  currentUserRole,
  onMemberUpdated,
}: MembersListProps) {
  const [memberToRemove, setMemberToRemove] = useState<Member | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  const isOwner = currentUserRole === 'OWNER';

  const handleRoleChange = async (memberId: string, newRole: 'OWNER' | 'ADMIN' | 'MEMBER') => {
    try {
      const response = await fetch(`/api/settings/organization/members/${memberId}`, {
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
      toast.error(error instanceof Error ? error.message : 'Failed to update role');
    }
  };

  const handleRemoveMember = async () => {
    if (!memberToRemove) return;

    setIsRemoving(true);
    try {
      const response = await fetch(`/api/settings/organization/members/${memberToRemove.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to remove member');
      }

      onMemberUpdated();
    } catch (error) {
      console.error('Failed to remove member:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to remove member');
    } finally {
      setIsRemoving(false);
      setMemberToRemove(null);
    }
  };

  const canManageMember = (member: Member): boolean => {
    // Can't manage yourself
    if (member.userId === currentUserId) return false;

    // Only owners can manage other owners
    if (member.role === 'OWNER') return isOwner;

    // Only owners can manage admins
    if (member.role === 'ADMIN') return isOwner;

    // Admins and owners can manage members
    return currentUserRole === 'OWNER' || currentUserRole === 'ADMIN';
  };

  return (
    <>
      <div className="divide-y divide-gray-800 rounded-lg border border-gray-800">
        {members.map((member) => {
          const RoleIcon = ROLE_ICONS[member.role];
          const isCurrentUser = member.userId === currentUserId;
          const canManage = canManageMember(member);

          return (
            <div key={member.id} className="flex items-center justify-between p-4">
              <div className="flex items-center gap-4">
                {/* Avatar */}
                <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-blue-600 to-purple-600 text-sm font-medium text-white">
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
                    <span className="font-medium text-white">
                      {member.user.name || member.user.email}
                    </span>
                    {isCurrentUser && <span className="text-xs text-gray-500">(you)</span>}
                    {member.isPending && (
                      <Badge variant="outline" className="text-xs">
                        Pending
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-400">{member.user.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Role badge */}
                <Badge
                  variant="outline"
                  className={`flex items-center gap-1 ${ROLE_COLORS[member.role]}`}
                >
                  <RoleIcon className="h-3 w-3" />
                  {member.role}
                </Badge>

                {/* Actions dropdown */}
                {canManage && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {isOwner && (
                        <>
                          <DropdownMenuItem
                            onClick={() => handleRoleChange(member.id, 'OWNER')}
                            disabled={member.role === 'OWNER'}
                          >
                            <Crown className="mr-2 h-4 w-4 text-yellow-500" />
                            Make Owner
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleRoleChange(member.id, 'ADMIN')}
                            disabled={member.role === 'ADMIN'}
                          >
                            <ShieldCheck className="mr-2 h-4 w-4 text-blue-500" />
                            Make Admin
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleRoleChange(member.id, 'MEMBER')}
                            disabled={member.role === 'MEMBER'}
                          >
                            <Shield className="mr-2 h-4 w-4 text-gray-400" />
                            Make Member
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                        </>
                      )}
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
          <div className="p-8 text-center text-gray-500">No members found</div>
        )}
      </div>

      {/* Remove confirmation dialog */}
      <AlertDialog open={!!memberToRemove} onOpenChange={() => setMemberToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove{' '}
              <strong>{memberToRemove?.user.name || memberToRemove?.user.email}</strong> from this
              organization? They will lose access to all projects and data.
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
