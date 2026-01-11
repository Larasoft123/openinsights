/**
 * Source Header Component
 *
 * Header for source detail page (Analysis Canvas).
 * Similar to ProjectHeader with breadcrumbs, source info, and stats.
 */

'use client';

import { useState, useEffect } from 'react';
import { Edit2, Check, X, Loader2, Search, Share2, Eye } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { GlobalSearch } from '@/components/dashboard/header/global-search';
import { ShareDialog } from '@/components/share/share-dialog';
import { useShareContext } from '@/lib/contexts/read-only-context';

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
  const { canEdit, basePath } = useShareContext();
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(sourceTitle);
  const [isSavingTitle, setIsSavingTitle] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);

  // Detect platform for keyboard shortcut display
  const [isMac] = useState(() => {
    if (typeof window === 'undefined') return false;
    return navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  });

  // Handle Ctrl+K / Cmd+K to open search (only in edit mode)
  useEffect(() => {
    if (!canEdit) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canEdit]);

  // Build breadcrumbs based on access mode
  const breadcrumbItems = canEdit
    ? [
        { label: workspaceName, href: '/' },
        { label: projectName, href: `/projects/${projectId}` },
        { label: sourceTitle },
      ]
    : [{ label: projectName, href: basePath }, { label: sourceTitle }];

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
      <header className="space-y-6 rounded-2xl border border-gray-800 bg-gray-900 p-6">
        {/* Top Row: Breadcrumbs and Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Breadcrumbs items={breadcrumbItems} />
            {/* Shared View Badge */}
            {!canEdit && (
              <div className="flex items-center gap-1.5 rounded-full bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-400">
                <Eye size={12} />
                <span>Shared View</span>
              </div>
            )}
          </div>

          {/* Action Buttons (only in edit mode) */}
          {canEdit && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsShareDialogOpen(true)}
                className="flex items-center gap-2 rounded-lg bg-gray-800 px-4 py-2 text-sm text-gray-400 transition-colors hover:bg-gray-700 hover:text-white"
              >
                <Share2 size={16} strokeWidth={1.5} />
                <span className="hidden sm:inline">Share</span>
              </button>
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
          )}
        </div>

        {/* Title */}
        <div>
          {canEdit && isEditingTitle ? (
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
                <Loader2 className="size-5 animate-spin text-gray-400" />
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
          ) : canEdit ? (
            <button
              onClick={() => setIsEditingTitle(true)}
              className="group -ml-1 flex items-center gap-2 rounded px-1 transition-colors hover:bg-gray-800"
            >
              <h1 className="text-3xl font-bold text-white">{sourceTitle}</h1>
              <Edit2 className="size-4 text-gray-400 opacity-0 transition-opacity group-hover:opacity-100" />
            </button>
          ) : (
            <h1 className="text-3xl font-bold text-white">{sourceTitle}</h1>
          )}
        </div>
      </header>

      {/* Global Search Dialog (only in edit mode) */}
      {canEdit && <GlobalSearch isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />}

      {/* Share Dialog (only in edit mode) */}
      {canEdit && (
        <ShareDialog
          open={isShareDialogOpen}
          onOpenChange={setIsShareDialogOpen}
          resourceType="source"
          resourceId={sourceId}
          resourceName={sourceTitle}
        />
      )}
    </>
  );
}
