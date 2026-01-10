/**
 * Sidebar User Profile Component
 *
 * Large user profile display at bottom of sidebar with dropdown menu.
 * Follows Modern Smart Home Dashboard pattern.
 */

'use client';

import { LogOut, Settings as SettingsIcon } from 'lucide-react';
import { signOut, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function SidebarUserProfile() {
  const { data: session } = useSession();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push('/login');
  };

  const handleSettings = () => {
    router.push('/settings');
    setIsMenuOpen(false);
  };

  return (
    <div className="relative mt-4">
      <button
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        className="group relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-800 text-white transition-all duration-200 hover:scale-110"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 text-lg font-medium">
          {session?.user?.name?.charAt(0).toUpperCase() || 'U'}
        </div>

        {/* Tooltip */}
        <div className="pointer-events-none invisible absolute left-20 z-50 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm whitespace-nowrap text-white opacity-0 shadow-lg transition-all duration-200 group-hover:visible group-hover:opacity-100">
          {session?.user?.name || 'User'}
          {/* Arrow */}
          <div className="absolute top-1/2 right-full -translate-y-1/2 border-4 border-transparent border-r-gray-800" />
        </div>
      </button>

      {/* User Dropdown Menu */}
      {isMenuOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setIsMenuOpen(false)} />

          {/* Menu */}
          <div className="absolute bottom-full left-20 z-50 mb-2 w-56 rounded-lg border border-gray-700 bg-gray-800 py-2 shadow-lg">
            {/* User Info */}
            <div className="border-b border-gray-700 px-4 py-3">
              <p className="text-sm font-medium text-white">{session?.user?.name || 'User'}</p>
              <p className="mt-1 text-xs text-gray-400">{session?.user?.email}</p>
            </div>

            {/* Menu Items */}
            <button
              onClick={handleSettings}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-gray-300 transition-colors hover:bg-gray-700 hover:text-white"
            >
              <SettingsIcon size={16} strokeWidth={1.5} />
              <span>Settings</span>
            </button>

            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-400 transition-colors hover:bg-gray-700"
            >
              <LogOut size={16} strokeWidth={1.5} />
              <span>Logout</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
