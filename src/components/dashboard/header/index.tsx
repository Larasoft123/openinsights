/**
 * Dashboard Header Component
 *
 * Top header with workspace selector and global search.
 * Uses Modern Smart Home Dashboard pattern with enhanced functionality.
 */

'use client';

import { Search, Plus } from 'lucide-react';
import { WorkspaceSelector } from './workspace-selector';
import { GlobalSearch } from './global-search';
import { CreateProjectDialog } from '@/components/projects/create-project-dialog';
import { useState, useEffect } from 'react';

export function Header() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

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

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Create Project Button */}
          <button
            onClick={() => setIsCreateDialogOpen(true)}
            className="bg-accent-primary hover:bg-accent-primary/90 flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors"
          >
            <Plus size={16} strokeWidth={2} />
            <span className="hidden sm:inline">New Project</span>
          </button>

          {/* Global Search Button */}
          <button
            onClick={() => setIsSearchOpen(true)}
            className="bg-muted text-muted-foreground hover:text-foreground hover:bg-muted flex items-center gap-2 rounded-lg px-4 py-2 text-sm transition-colors"
          >
            <Search size={16} strokeWidth={1.5} />
            <span className="hidden sm:inline">Search...</span>
            <span className="text-muted-foreground ml-2 hidden text-xs md:inline">
              {isMac ? '⌘K' : 'Ctrl+K'}
            </span>
          </button>
        </div>
      </header>

      {/* Global Search Dialog */}
      <GlobalSearch isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />

      {/* Create Project Dialog */}
      <CreateProjectDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
      />
    </>
  );
}
