/**
 * Dashboard Header Component
 *
 * Top header with workspace selector, global search, and user menu.
 * Uses Modern Smart Home Dashboard pattern with enhanced functionality.
 */

'use client';

import { Search, LogOut, Settings } from 'lucide-react';
import { signOut, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { WorkspaceSelector } from './workspace-selector';
import { GlobalSearch } from './global-search';
import { useState } from 'react';

export function Header() {
  const { data: session } = useSession();
  const router = useRouter();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  // Detect platform for keyboard shortcut display (lazy initialization)
  const [isMac] = useState(() => {
    if (typeof window === 'undefined') return false;
    return navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  });

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push('/login');
  };

  const handleSettings = () => {
    router.push('/settings');
    setIsUserMenuOpen(false);
  };

  return (
    <>
      <header className="bg-surface-1 border-border-subtle bg-surface-1/95 sticky top-0 z-40 border-b backdrop-blur-sm">
        <div className="flex h-16 items-center justify-between px-4 sm:h-20 sm:px-6 lg:px-8">
          {/* Left: Workspace Selector */}
          <div className="flex items-center gap-4">
            <WorkspaceSelector />
          </div>

          {/* Right: Search + User */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Global Search Button */}
            <button
              onClick={() => setIsSearchOpen(true)}
              className="bg-surface-2 text-text-secondary hover:bg-surface-3 hover:text-text-primary flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors sm:px-4"
            >
              <Search size={16} />
              <span className="hidden sm:inline">Search...</span>
              <span className="text-text-tertiary ml-2 hidden text-xs md:inline">
                {isMac ? '⌘K' : 'Ctrl+K'}
              </span>
            </button>

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="hover:bg-surface-2 flex items-center gap-2 rounded-lg px-2 py-2 transition-colors sm:gap-3 sm:px-3"
              >
                <div className="bg-accent-primary flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium text-white sm:h-10 sm:w-10">
                  {session?.user?.name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <span className="text-text-primary hidden text-sm font-medium md:inline">
                  {session?.user?.name || 'User'}
                </span>
              </button>

              {/* User Dropdown Menu */}
              {isUserMenuOpen && (
                <>
                  {/* Backdrop */}
                  <div className="fixed inset-0 z-40" onClick={() => setIsUserMenuOpen(false)} />

                  {/* Menu */}
                  <div className="bg-surface-1 border-border-subtle absolute top-full right-0 z-50 mt-2 w-56 rounded-lg border py-2 shadow-lg">
                    {/* User Info */}
                    <div className="border-border-subtle border-b px-4 py-3">
                      <p className="text-text-primary text-sm font-medium">
                        {session?.user?.name || 'User'}
                      </p>
                      <p className="text-text-secondary mt-1 text-xs">{session?.user?.email}</p>
                    </div>

                    {/* Menu Items */}
                    <button
                      onClick={handleSettings}
                      className="hover:bg-surface-2 text-text-primary flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-colors"
                    >
                      <Settings size={16} />
                      <span>Settings</span>
                    </button>

                    <button
                      onClick={handleLogout}
                      className="hover:bg-surface-2 text-error flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-colors"
                    >
                      <LogOut size={16} />
                      <span>Logout</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Global Search Dialog */}
      <GlobalSearch isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
}
