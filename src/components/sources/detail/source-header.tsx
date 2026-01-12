/**
 * Source Header Component
 *
 * Header for source detail page (Analysis Canvas).
 * Similar to ProjectHeader with breadcrumbs, source info, and stats.
 */

'use client';

import { useState, useEffect } from 'react';
import { Edit2, Check, X, Loader2, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { GlobalSearch } from '@/components/dashboard/header/global-search';

interface SourceHeaderProps {
  sourceId: string;
  sourceTitle: string;
  projectId: string;
  projectName: string;
  workspaceName: string;
}

export function SourceHeader({
  sourceId,
  sourceTitle,
  projectId,
  projectName,
  workspaceName,
}: SourceHeaderProps) {
  const router = useRouter();
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(sourceTitle);
  const [isSavingTitle, setIsSavingTitle] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Detect platform for keyboard shortcut display
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

  // Save source title via API
  const handleSaveTitle = async () => {
    const trimmed = editedTitle.trim();
    if (!trimmed || trimmed === sourceTitle) {
      setIsEditingTitle(false);
      setEditedTitle(sourceTitle);
      return;
    }

    setIsSavingTitle(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/sources/${sourceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: trimmed }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update title');
      }

      setIsEditingTitle(false);
      router.refresh();
    } catch (error) {
      console.error('Failed to update title:', error);
      setEditedTitle(sourceTitle);
      setIsEditingTitle(false);
    } finally {
      setIsSavingTitle(false);
    }
  };

  return (
    <>
      <header className="border-border bg-card space-y-6 rounded-2xl border p-6">
        {/* Top Row: Breadcrumbs and Search */}
        <div className="flex items-center justify-between">
          <Breadcrumbs
            items={[
              { label: workspaceName, href: '/' },
              { label: projectName, href: `/projects/${projectId}` },
              { label: sourceTitle },
            ]}
          />

          {/* Global Search Button */}
          <button
            onClick={() => setIsSearchOpen(true)}
            className="bg-card text-muted-foreground hover:bg-muted hover:text-foreground flex items-center gap-2 rounded-lg px-4 py-2 text-sm transition-colors"
          >
            <Search size={16} strokeWidth={1.5} />
            <span className="hidden sm:inline">Search...</span>
            <span className="text-muted-foreground ml-2 hidden text-xs md:inline">
              {isMac ? '⌘K' : 'Ctrl+K'}
            </span>
          </button>
        </div>

        {/* Title */}
        <div>
          {isEditingTitle ? (
            <div className="flex items-center gap-2">
              <Input
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSaveTitle();
                  } else if (e.key === 'Escape') {
                    setIsEditingTitle(false);
                    setEditedTitle(sourceTitle);
                  }
                }}
                onBlur={handleSaveTitle}
                className="h-10 max-w-xl text-2xl font-bold"
                autoFocus
                disabled={isSavingTitle}
              />
              {isSavingTitle ? (
                <Loader2 className="text-muted-foreground size-5 animate-spin" />
              ) : (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={handleSaveTitle}
                  >
                    <Check className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => {
                      setIsEditingTitle(false);
                      setEditedTitle(sourceTitle);
                    }}
                  >
                    <X className="size-4" />
                  </Button>
                </>
              )}
            </div>
          ) : (
            <button
              onClick={() => setIsEditingTitle(true)}
              className="group hover:bg-muted -ml-1 flex items-center gap-2 rounded px-1 transition-colors"
            >
              <h1 className="text-foreground text-3xl font-bold">{sourceTitle}</h1>
              <Edit2 className="text-muted-foreground size-4 opacity-0 transition-opacity group-hover:opacity-100" />
            </button>
          )}
        </div>
      </header>

      {/* Global Search Dialog */}
      <GlobalSearch isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
}
