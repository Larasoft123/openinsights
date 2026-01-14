import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { WorkspacesList } from '@/components/settings/workspaces-list';

export const metadata = {
  title: 'Workspace Settings - OpenInsights',
};

export default async function WorkspaceSettingsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold">Workspaces</h1>
        <p className="text-muted-foreground mt-1">Manage your workspaces and team access</p>
      </div>

      <WorkspacesList currentUserId={session.user.id} />
    </div>
  );
}
