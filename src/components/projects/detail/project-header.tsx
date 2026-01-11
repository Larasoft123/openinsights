/**
 * Project Header Component
 *
 * Unified header for all project pages (Sources, Evidence, Insights).
 * Includes breadcrumbs, project info, stats, navigation, and search.
 */

'use client';

import { useState } from 'react';
import { Search, Share2 } from 'lucide-react';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { ProjectPillNav } from './project-pill-nav';
import { GlobalSearch } from '@/components/dashboard/header/global-search';
import { ProjectSummary } from './summary';
import { ShareDialog } from '@/components/share/share-dialog';

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
  summary,
  summaryStatus,
  summaryGeneratedAt,
}: ProjectHeaderProps) {
  void _highlightsCount; // Reserved for future use
  void _updatedAt; // Reserved for future use

  const [searchOpen, setSearchOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);

  // Detect platform for keyboard shortcut
  const isMac =
    typeof window !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;

  return (
    <>
      <header className="space-y-6 rounded-2xl border border-gray-800 bg-gray-900 p-6">
        {/* Top Row: Breadcrumbs & Search */}
        <div className="flex items-center justify-between">
          <Breadcrumbs
            items={[
              { label: workspaceName, href: '/' },
              { label: projectName, href: `/projects/${projectId}` },
            ]}
          />

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
          </div>
        </div>

        {/* Project Info */}
        <div>
          <h1 className="text-3xl font-bold text-white">{projectName}</h1>
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

      {/* Global Search Dialog */}
      <GlobalSearch isOpen={searchOpen} onClose={() => setSearchOpen(false)} />

      {/* Share Dialog */}
      <ShareDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        resourceType="project"
        resourceId={projectId}
        resourceName={projectName}
      />
    </>
  );
}
