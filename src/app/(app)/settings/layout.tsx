import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { SettingsSidebar } from '@/components/settings/settings-sidebar';

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  // Get user's role in the current organization
  const currentRole = session.user.currentRole;

  return (
    // contain: strict fixes Chrome bug where scrollable content inside affects document height
    <div className="-m-4 flex h-screen sm:-m-6 lg:-m-8" style={{ contain: 'strict' }}>
      <SettingsSidebar currentRole={currentRole} />
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">{children}</div>
    </div>
  );
}
