/**
 * Project Header Component
 *
 * Unified header for all project pages (Sources, Evidence, Insights).
 * Includes breadcrumbs, project info, stats, navigation, and search.
 * Supports read-only mode for shared views.
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { Search, Share2, Eye, Archive, Edit2, Check, X, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { Button } from '@/components/ui/button';
import { ProjectPillNav } from './project-pill-nav';
import { GlobalSearch } from '@/components/dashboard/header/global-search';
import { ProjectSummary } from './summary';
import { ShareDialog } from '@/components/share/share-dialog';
import { useShareContext } from '@/lib/contexts/read-only-context';
import { ProjectActionsDropdown } from '@/components/projects/project-actions-dropdown';

interface ProjectSummaryData {
  researchObjectives: string[];
  keyFindings: string[];
  participantOverview: { count: number; description?: string };
  recommendations: string[];
  sourcesAnalyzed: number;
}

interface ProjectHeaderProps {
  projectId: string;
  projectName: string;
  description: string | null;
  workspaceName: string;
  sourcesCount: number;
  highlightsCount: number;
  updatedAt: Date;
  archivedAt?: Date | null;
  summary?: ProjectSummaryData | null;
  summaryStatus?: 'PENDING' | 'GENERATING' | 'COMPLETED' | 'FAILED' | null;
  summaryGeneratedAt?: Date | string | null;
}

export function ProjectHeader({
  projectId,
  projectName,
  description,
  workspaceName,
  sourcesCount,
  highlightsCount: _highlightsCount,
  updatedAt: _updatedAt,
  archivedAt,
  summary,
  summaryStatus,
  summaryGeneratedAt,
}: ProjectHeaderProps) {
  void _highlightsCount; // Reserved for future use
  void _updatedAt; // Reserved for future use

  const router = useRouter();
  const { canEdit } = useShareContext();
  const [searchOpen, setSearchOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [isSavingName, setIsSavingName] = useState(false);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const isArchived = !!archivedAt;

  // Focus and select text when entering edit mode
  useEffect(() => {
    if (isEditingName && titleRef.current) {
      titleRef.current.focus();
      // Select all text
      const range = document.createRange();
      range.selectNodeContents(titleRef.current);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  }, [isEditingName]);

  // Save project name via API
  const handleSaveName = async () => {
    const newName = titleRef.current?.textContent?.trim() || '';
    if (!newName || newName === projectName) {
      // Reset to original if empty or unchanged
      if (titleRef.current) {
        titleRef.current.textContent = projectName;
      }
      setIsEditingName(false);
      return;
    }

    setIsSavingName(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update name');
      }

      setIsEditingName(false);
      router.refresh();
    } catch (error) {
      console.error('Failed to update name:', error);
      if (titleRef.current) {
        titleRef.current.textContent = projectName;
      }
      setIsEditingName(false);
    } finally {
      setIsSavingName(false);
    }
  };

  // Cancel editing
  const handleCancelEdit = () => {
    if (titleRef.current) {
      titleRef.current.textContent = projectName;
    }
    setIsEditingName(false);
  };

  // Detect platform for keyboard shortcut
  const isMac =
    typeof window !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;

  // In read-only mode, show badge instead of breadcrumbs with links
  const breadcrumbItems = canEdit
    ? [
        { label: workspaceName, href: '/projects' },
        { label: projectName, href: `/projects/${projectId}` },
      ]
    : [{ label: projectName }];

  return (
    <>
      <header className="space-y-6 rounded-2xl border border-border bg-background p-6">
        {/* Top Row: Breadcrumbs & Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {!canEdit ? (
              <div className="flex items-center gap-1.5 rounded-full bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-400">
                <Eye size={12} />
                <span>Shared View</span>
              </div>
            ) : (
              <Breadcrumbs items={breadcrumbItems} />
            )}
          </div>

          {/* Only show actions in edit mode */}
          {canEdit && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShareDialogOpen(true)}
                className="flex items-center gap-2 rounded-lg bg-muted px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <Share2 size={16} strokeWidth={1.5} />
                <span className="hidden sm:inline">Share</span>
              </button>
              <button
                onClick={() => setSearchOpen(true)}
                className="flex items-center gap-2 rounded-lg bg-muted px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <Search size={16} strokeWidth={1.5} />
                <span className="hidden sm:inline">Search...</span>
                <span className="ml-2 hidden text-xs text-gray-500 md:inline">
                  {isMac ? '⌘K' : 'Ctrl+K'}
                </span>
              </button>
              <ProjectActionsDropdown
                project={{
                  id: projectId,
                  name: projectName,
                  description,
                  archivedAt: archivedAt ?? null,
                }}
                variant="header"
                redirectAfterArchive
              />
            </div>
          )}
        </div>

        {/* Project Info */}
        <div>
          <div className="flex items-center gap-3">
            {canEdit ? (
              <div className="group flex items-center gap-2">
                <h1
                  ref={titleRef}
                  contentEditable={isEditingName}
                  suppressContentEditableWarning
                  onClick={() => !isEditingName && setIsEditingName(true)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSaveName();
                    } else if (e.key === 'Escape') {
                      handleCancelEdit();
                    }
                  }}
                  className={`text-3xl font-bold text-foreground outline-none ${
                    isEditingName
                      ? 'cursor-text rounded bg-muted/50 px-2 py-1 ring-1 ring-gray-700'
                      : 'cursor-pointer rounded px-2 py-1 transition-colors hover:bg-muted'
                  }`}
                >
                  {projectName}
                </h1>
                {isEditingName ? (
                  isSavingName ? (
                    <Loader2 className="size-5 animate-spin text-muted-foreground" />
                  ) : (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={handleSaveName}
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
                  <Edit2 className="size-4 text-gray-400 opacity-0 transition-opacity group-hover:opacity-100" />
                )}
              </div>
            ) : (
              <h1 className="text-3xl font-bold text-white">{projectName}</h1>
            )}
            {isArchived && (
              <div className="flex items-center gap-1.5 rounded-full bg-amber-500/20 px-3 py-1 text-xs font-medium text-amber-400">
                <Archive size={12} />
                <span>Archived</span>
              </div>
            )}
          </div>
          {description && <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{description}</p>}
        </div>

        {/* Project Summary */}
        <ProjectSummary
          projectId={projectId}
          initialSummary={summary}
          initialStatus={summaryStatus}
          initialGeneratedAt={summaryGeneratedAt}
          sourcesCount={sourcesCount}
        />

        {/* Bottom Row: Navigation Pills */}
        <ProjectPillNav projectId={projectId} />
      </header>

      {/* Dialogs only in edit mode */}
      {canEdit && (
        <>
          <GlobalSearch isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
          <ShareDialog
            open={shareDialogOpen}
            onOpenChange={setShareDialogOpen}
            resourceType="project"
            resourceId={projectId}
            resourceName={projectName}
          />
        </>
      )}
    </>
  );
}
