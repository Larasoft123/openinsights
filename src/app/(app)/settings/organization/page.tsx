import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { OrganizationForm } from '@/components/settings/organization-form';

export const metadata = {
  title: 'Organization Settings - OpenInsights',
};

export default async function OrganizationSettingsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  const currentRole = session.user.currentRole;

  // Only admins and owners can access organization settings
  if (!currentRole || (currentRole !== 'ADMIN' && currentRole !== 'OWNER')) {
    redirect('/settings/profile');
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold">Organization</h1>
        <p className="text-muted-foreground mt-1">Manage your organization and team members</p>
      </div>

      <OrganizationForm currentUserId={session.user.id} currentUserRole={currentRole} />
    </div>
  );
}
