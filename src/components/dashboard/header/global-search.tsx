/**
 * Global Search Dialog Component
 *
 * ⌘K command palette for quick navigation and search.
 * Future: Will include semantic search across all content.
 */

'use client';

import { useEffect, useState } from 'react';
import { Search, FileVideo, FolderOpen, Tag, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';

// Detect if user is on Mac for keyboard shortcut display
const isMacPlatform = () => {
  if (typeof window === 'undefined') return false;
  return navigator.platform.toUpperCase().indexOf('MAC') >= 0;
};

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GlobalSearch({ isOpen, onClose }: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const router = useRouter();

  // Detect platform (lazy initialization)
  const [isMac] = useState(() => isMacPlatform());

  // Reset query and close dialog
  const handleClose = () => {
    setQuery('');
    onClose();
  };

  // Handle ⌘K keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (isOpen) {
          handleClose();
        } else {
          // Note: Opening is handled by Header component
        }
      }
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  const quickLinks = [
    { id: 'projects', icon: FolderOpen, label: 'All Projects', href: '/projects' },
    { id: 'dashboard', icon: FileVideo, label: 'Recent Sources', href: '/dashboard' },
    { id: 'highlights', icon: Tag, label: 'All Highlights', href: '/projects' },
    { id: 'settings', icon: Sparkles, label: 'Settings', href: '/settings' },
  ];

  const handleQuickLink = (href: string) => {
    router.push(href);
    handleClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={handleClose} />

      {/* Dialog */}
      <div className="fixed top-[20%] left-1/2 z-50 w-full max-w-2xl -translate-x-1/2 px-4">
        <div className="border-border bg-background overflow-hidden rounded-xl border shadow-2xl">
          {/* Search Input */}
          <div className="border-border flex items-center gap-3 border-b px-4 py-4">
            <Search size={20} strokeWidth={1.5} className="text-muted-foreground flex-shrink-0" />
            <input
              type="text"
              placeholder={`Search projects, sources, highlights... (${isMac ? '⌘K' : 'Ctrl+K'})`}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="text-foreground placeholder:text-muted-foreground flex-1 bg-transparent text-sm outline-none"
              autoFocus
            />
            <kbd className="border-border bg-muted text-muted-foreground hidden items-center gap-1 rounded border px-2 py-1 font-mono text-xs sm:inline-flex">
              ESC
            </kbd>
          </div>

          {/* Results / Quick Links */}
          <div className="max-h-96 overflow-y-auto p-2">
            {query ? (
              // Search Results (placeholder)
              <div className="px-4 py-8 text-center">
                <p className="text-muted-foreground text-sm">Semantic search coming soon...</p>
                <p className="text-muted-foreground mt-2 text-xs">
                  Press Enter to search for &quot;{query}&quot;
                </p>
              </div>
            ) : (
              // Quick Links
              <div>
                <p className="text-muted-foreground px-3 py-2 text-xs font-medium tracking-wider uppercase">
                  Quick Links
                </p>
                <div className="space-y-1">
                  {quickLinks.map((link) => (
                    <button
                      key={link.id}
                      onClick={() => handleQuickLink(link.href)}
                      className="group hover:bg-muted flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors"
                    >
                      <link.icon
                        size={18}
                        strokeWidth={1.5}
                        className="text-muted-foreground flex-shrink-0 transition-colors group-hover:text-blue-500"
                      />
                      <span className="text-foreground text-sm">{link.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
