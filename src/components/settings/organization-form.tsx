'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MembersList } from './members-list';
import { InviteMemberDialog } from './invite-member-dialog';

interface Organization {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  memberCount: number;
}

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

interface OrganizationFormProps {
  currentUserId: string;
  currentUserRole: 'OWNER' | 'ADMIN' | 'MEMBER';
}

export function OrganizationForm({ currentUserId, currentUserRole }: OrganizationFormProps) {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const isOwner = currentUserRole === 'OWNER';

  const fetchOrganization = useCallback(async () => {
    try {
      const response = await fetch('/api/settings/organization');
      if (response.ok) {
        const data = await response.json();
        setOrganization(data);
        setName(data.name);
      }
    } catch (error) {
      console.error('Failed to fetch organization:', error);
    }
  }, []);

  const fetchMembers = useCallback(async () => {
    try {
      const response = await fetch('/api/settings/organization/members');
      if (response.ok) {
        const data = await response.json();
        setMembers(data);
      }
    } catch (error) {
      console.error('Failed to fetch members:', error);
    }
  }, []);

  useEffect(() => {
    Promise.all([fetchOrganization(), fetchMembers()]).finally(() => {
      setIsLoading(false);
    });
  }, [fetchOrganization, fetchMembers]);

  const handleSaveOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOwner) return;

    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/settings/organization', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update organization');
      }

      const updated = await response.json();
      setOrganization(updated);
      setMessage({ type: 'success', text: 'Organization updated successfully' });
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to update organization',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleMemberUpdated = () => {
    fetchMembers();
    fetchOrganization(); // Refresh member count
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
      {/* Organization Details */}
      <Card>
        <CardHeader>
          <CardTitle>Organization Details</CardTitle>
          <CardDescription>
            {isOwner ? 'Manage your organization settings.' : 'View your organization information.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveOrganization} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="orgName" className="text-sm font-medium">
                Organization Name
              </label>
              <Input
                id="orgName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={!isOwner}
                className={!isOwner ? 'bg-gray-800/50' : ''}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-400">Slug</label>
              <p className="text-sm text-gray-300">{organization?.slug}</p>
            </div>

            {message && (
              <div
                className={`rounded-md p-3 ${
                  message.type === 'success'
                    ? 'border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
                    : 'border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
                }`}
              >
                <p
                  className={`text-sm ${
                    message.type === 'success'
                      ? 'text-green-800 dark:text-green-200'
                      : 'text-red-800 dark:text-red-200'
                  }`}
                >
                  {message.text}
                </p>
              </div>
            )}

            {isOwner && (
              <Button type="submit" disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Members */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Team Members</CardTitle>
              <CardDescription>
                {organization?.memberCount || members.length} members in this organization
              </CardDescription>
            </div>
            <InviteMemberDialog onMemberInvited={handleMemberUpdated} />
          </div>
        </CardHeader>
        <CardContent>
          <MembersList
            members={members}
            currentUserId={currentUserId}
            currentUserRole={currentUserRole}
            onMemberUpdated={handleMemberUpdated}
          />
        </CardContent>
      </Card>
    </div>
  );
}
