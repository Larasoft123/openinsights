/**
 * Global Search Dialog Component
 *
 * ⌘K command palette for quick navigation and search.
 * Future: Will include semantic search across all content.
 * Uses Shadcn Dialog for consistent UX, accessibility, and ESC key handling.
 */

'use client';

import { useEffect, useState } from 'react';
import { Search, FileVideo, FolderOpen, Tag, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent } from '@/components/ui/dialog';

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

  // Handle ⌘K keyboard shortcut for toggle (ESC is handled by Dialog)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (isOpen) {
          handleClose();
        }
        // Note: Opening is handled by Header component
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

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
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="top-[20%] translate-y-0 sm:max-w-2xl" showCloseButton={false}>
        {/* Search Input */}
        <div className="-mx-6 -mt-6 flex items-center gap-3 border-b border-gray-800 px-4 py-4">
          <Search size={20} strokeWidth={1.5} className="flex-shrink-0 text-gray-400" />
          <input
            type="text"
            placeholder={`Search projects, sources, highlights... (${isMac ? '⌘K' : 'Ctrl+K'})`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-gray-400"
            autoFocus
          />
          <kbd className="hidden items-center gap-1 rounded border border-gray-800 bg-gray-800 px-2 py-1 font-mono text-xs text-gray-400 sm:inline-flex">
            ESC
          </kbd>
        </div>

        {/* Results / Quick Links */}
        <div className="-mx-6 -mb-6 max-h-96 overflow-y-auto p-2">
          {query ? (
            // Search Results (placeholder)
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-gray-400">Semantic search coming soon...</p>
              <p className="mt-2 text-xs text-gray-400">
                Press Enter to search for &quot;{query}&quot;
              </p>
            </div>
          ) : (
            // Quick Links
            <div>
              <p className="px-3 py-2 text-xs font-medium tracking-wider text-gray-400 uppercase">
                Quick Links
              </p>
              <div className="space-y-1">
                {quickLinks.map((link) => (
                  <button
                    key={link.id}
                    onClick={() => handleQuickLink(link.href)}
                    className="group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-gray-800"
                  >
                    <link.icon
                      size={18}
                      strokeWidth={1.5}
                      className="flex-shrink-0 text-gray-400 transition-colors group-hover:text-blue-500"
                    />
                    <span className="text-sm text-white">{link.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
