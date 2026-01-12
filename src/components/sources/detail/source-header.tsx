/**
 * Source Header Component
 *
 * Header for source detail page (Analysis Canvas).
 * Similar to ProjectHeader with breadcrumbs, source info, and stats.
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { Edit2, Check, X, Loader2, Search, Share2, Eye } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
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
  const [isSavingTitle, setIsSavingTitle] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const titleRef = useRef<HTMLHeadingElement>(null);

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

  // Focus and select text when entering edit mode
  useEffect(() => {
    if (isEditingTitle && titleRef.current) {
      titleRef.current.focus();
      // Select all text
      const range = document.createRange();
      range.selectNodeContents(titleRef.current);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  }, [isEditingTitle]);

  // Build breadcrumbs based on access mode
  const breadcrumbItems = canEdit
    ? [
        { label: workspaceName, href: '/projects' },
        { label: projectName, href: `/projects/${projectId}` },
        { label: sourceTitle },
      ]
    : [{ label: projectName, href: basePath }, { label: sourceTitle }];

  // Save source title via API
  const handleSaveTitle = async () => {
    const newTitle = titleRef.current?.textContent?.trim() || '';
    if (!newTitle || newTitle === sourceTitle) {
      // Reset to original if empty or unchanged
      if (titleRef.current) {
        titleRef.current.textContent = sourceTitle;
      }
      setIsEditingTitle(false);
      return;
    }

    setIsSavingTitle(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/sources/${sourceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update title');
      }

      setIsEditingTitle(false);
      router.refresh();
    } catch (error) {
      console.error('Failed to update title:', error);
      if (titleRef.current) {
        titleRef.current.textContent = sourceTitle;
      }
      setIsEditingTitle(false);
    } finally {
      setIsSavingTitle(false);
    }
  };

  // Cancel editing
  const handleCancelEdit = () => {
    if (titleRef.current) {
      titleRef.current.textContent = sourceTitle;
    }
    setIsEditingTitle(false);
  };

  return (
    <>
      <header className="space-y-6 rounded-2xl border border-border bg-card p-6">
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
                className="flex items-center gap-2 rounded-lg bg-card px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <Share2 size={16} strokeWidth={1.5} />
                <span className="hidden sm:inline">Share</span>
              </button>
              <button
                onClick={() => setIsSearchOpen(true)}
                className="flex items-center gap-2 rounded-lg bg-card px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
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
          {canEdit ? (
            <div className="group flex items-center gap-2">
              <h1
                ref={titleRef}
                contentEditable={isEditingTitle}
                suppressContentEditableWarning
                onClick={() => !isEditingTitle && setIsEditingTitle(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSaveTitle();
                  } else if (e.key === 'Escape') {
                    handleCancelEdit();
                  }
                }}
                className={`text-3xl font-bold text-white outline-none ${
                  isEditingTitle
                    ? 'cursor-text rounded bg-muted/50 px-2 py-1 ring-1 ring-gray-700'
                    : 'cursor-pointer rounded px-2 py-1 transition-colors hover:bg-muted'
                }`}
              >
                {sourceTitle}
              </h1>
              {isEditingTitle ? (
                isSavingTitle ? (
                  <Loader2 className="size-5 animate-spin text-muted-foreground" />
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
                      onClick={handleCancelEdit}
                    >
                      <X className="size-4" />
                    </Button>
                  </>
                )
              ) : (
                <Edit2 className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              )}
            </div>
          ) : (
            <h1 className="text-3xl font-bold text-foreground">{sourceTitle}</h1>
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
