/**
 * Source Header Component
 *
 * Header for source detail page (Analysis Canvas).
 * Similar to ProjectHeader with breadcrumbs, source info, and stats.
 */

'use client';

import { useState, useEffect } from 'react';
import { Clock, FileVideo, Edit2, Check, X, Loader2, Search } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
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
  duration: number | null;
  segmentsCount: number;
  highlightsCount: number;
  createdAt: Date;
}

// Format duration from seconds to MM:SS or HH:MM:SS
function formatDuration(seconds: number | null): string {
  if (!seconds) return '0:00';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

export function SourceHeader({
  sourceId,
  sourceTitle,
  projectId,
  projectName,
  workspaceName,
  duration,
  segmentsCount,
  highlightsCount,
  createdAt,
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
      <header className="space-y-6 rounded-2xl border border-gray-800 bg-gray-900 p-6">
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
            className="flex items-center gap-2 rounded-lg bg-gray-800 px-4 py-2 text-sm text-gray-400 transition-colors hover:bg-gray-700 hover:text-white"
          >
            <Search size={16} strokeWidth={1.5} />
            <span className="hidden sm:inline">Search...</span>
            <span className="ml-2 hidden text-xs text-gray-500 md:inline">
              {isMac ? '⌘K' : 'Ctrl+K'}
            </span>
          </button>
        </div>

        {/* Title */}
        <div className="space-y-3">
          <div className="flex-1">
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
            ) : (
              <button
                onClick={() => setIsEditingTitle(true)}
                className="group -ml-1 flex items-center gap-2 rounded px-1 transition-colors hover:bg-gray-800"
              >
                <h1 className="text-3xl font-bold text-white">{sourceTitle}</h1>
                <Edit2 className="size-4 text-gray-400 opacity-0 transition-opacity group-hover:opacity-100" />
              </button>
            )}
          </div>

          {/* Stats Badges - Below Title */}
          <div className="flex gap-2">
            {duration && (
              <div className="flex items-center gap-1.5 rounded-full border border-gray-800 bg-gray-800/50 px-3 py-1.5">
                <Clock size={14} strokeWidth={1.5} className="text-blue-400" />
                <span className="text-xs font-medium text-white">{formatDuration(duration)}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 rounded-full border border-gray-800 bg-gray-800/50 px-3 py-1.5">
              <FileVideo size={14} strokeWidth={1.5} className="text-purple-400" />
              <span className="text-xs font-medium text-white">
                {segmentsCount} {segmentsCount === 1 ? 'segment' : 'segments'}
              </span>
            </div>
            {highlightsCount > 0 && (
              <div className="flex items-center gap-1.5 rounded-full border border-gray-800 bg-gray-800/50 px-3 py-1.5">
                <svg
                  className="size-3.5 text-green-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                  />
                </svg>
                <span className="text-xs font-medium text-white">
                  {highlightsCount} {highlightsCount === 1 ? 'highlight' : 'highlights'}
                </span>
              </div>
            )}
            <div className="flex items-center gap-1.5 rounded-full border border-gray-800 bg-gray-800/50 px-3 py-1.5">
              <Clock size={14} strokeWidth={1.5} className="text-orange-400" />
              <span className="text-xs font-medium text-white">
                {formatDistanceToNow(createdAt, { addSuffix: true })}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Global Search Dialog */}
      <GlobalSearch isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
}
