import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Settings - OpenInsights',
};

/**
 * Settings root page - redirects to profile settings
 */
export default function SettingsPage() {
  redirect('/settings/profile');
}
