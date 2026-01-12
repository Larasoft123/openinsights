/**
 * Project Header Component
 *
 * Unified header for all project pages (Sources, Evidence, Insights).
 * Includes breadcrumbs, project info, stats, navigation, and search.
 * Supports read-only mode for shared views.
 */

'use client';

import { useState } from 'react';
import { Search, Share2, Eye, Archive } from 'lucide-react';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
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

  const { canEdit } = useShareContext();
  const [searchOpen, setSearchOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const isArchived = !!archivedAt;

  // Detect platform for keyboard shortcut
  const isMac =
    typeof window !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;

  // In read-only mode, show badge instead of breadcrumbs with links
  const breadcrumbItems = canEdit
    ? [
        { label: workspaceName, href: '/' },
        { label: projectName, href: `/projects/${projectId}` },
      ]
    : [{ label: projectName }];

  return (
    <>
      <header className="space-y-6 rounded-2xl border border-gray-800 bg-gray-900 p-6">
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
                className="flex items-center gap-2 rounded-lg bg-gray-800 px-4 py-2 text-sm text-gray-400 transition-colors hover:bg-gray-700 hover:text-white"
              >
                <Share2 size={16} strokeWidth={1.5} />
                <span className="hidden sm:inline">Share</span>
              </button>
              <button
                onClick={() => setSearchOpen(true)}
                className="flex items-center gap-2 rounded-lg bg-gray-800 px-4 py-2 text-sm text-gray-400 transition-colors hover:bg-gray-700 hover:text-white"
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
            <h1 className="text-3xl font-bold text-white">{projectName}</h1>
            {isArchived && (
              <div className="flex items-center gap-1.5 rounded-full bg-amber-500/20 px-3 py-1 text-xs font-medium text-amber-400">
                <Archive size={12} />
                <span>Archived</span>
              </div>
            )}
          </div>
          {description && <p className="mt-2 max-w-2xl text-sm text-gray-400">{description}</p>}
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
