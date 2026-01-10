/**
 * Dashboard Header Component
 *
 * Top header with workspace selector and global search.
 * Uses Modern Smart Home Dashboard pattern with enhanced functionality.
 */

'use client';

import { Search } from 'lucide-react';
import { WorkspaceSelector } from './workspace-selector';
import { GlobalSearch } from './global-search';
import { useState, useEffect } from 'react';

export function Header() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Detect platform for keyboard shortcut display (lazy initialization)
  const [isMac] = useState(() => {
    if (typeof window === 'undefined') return false;
    return navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  });

  // Handle Ctrl+K / Cmd+K to open search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      <header className="flex items-center justify-between">
        {/* Left: Greeting */}
        <WorkspaceSelector />

        {/* Right: Search */}
        <div className="flex items-center">
          {/* Global Search Button */}
          <button
            onClick={() => setIsSearchOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-gray-800 px-4 py-2 text-sm text-gray-400 transition-colors hover:bg-gray-700 hover:text-white"
          >
            <Search size={16} strokeWidth={1.5} />
            <span className="hidden sm:inline">Search...</span>
            <span className="ml-2 hidden text-xs text-gray-500 md:inline">
              {isMac ? '⌘K' : 'Ctrl+K'}
            </span>
          </button>
        </div>
      </header>

      {/* Global Search Dialog */}
      <GlobalSearch isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
}
