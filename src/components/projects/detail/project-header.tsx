/**
 * Project Header Component
 *
 * Unified header for all project pages (Sources, Evidence, Insights).
 * Includes breadcrumbs, project info, stats, navigation, and search.
 */

'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { ProjectPillNav } from './project-pill-nav';
import { GlobalSearch } from '@/components/dashboard/header/global-search';
import { ProjectSummary } from './summary';

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

  // Detect platform for keyboard shortcut
  const isMac =
    typeof window !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;

  return (
    <>
      <header className="border-border bg-background space-y-6 rounded-2xl border p-6">
        {/* Top Row: Breadcrumbs & Search */}
        <div className="flex items-center justify-between">
          <Breadcrumbs
            items={[
              { label: workspaceName, href: '/' },
              { label: projectName, href: `/projects/${projectId}` },
            ]}
          />

          <button
            onClick={() => setSearchOpen(true)}
            className="bg-muted text-muted-foreground hover:text-foreground hover:bg-muted flex items-center gap-2 rounded-lg px-4 py-2 text-sm transition-colors"
          >
            <Search size={16} strokeWidth={1.5} />
            <span className="hidden sm:inline">Search...</span>
            <span className="text-muted-foreground ml-2 hidden text-xs md:inline">
              {isMac ? '⌘K' : 'Ctrl+K'}
            </span>
          </button>
        </div>

        {/* Project Info */}
        <div>
          <h1 className="text-foreground text-3xl font-bold">{projectName}</h1>
          {description && (
            <p className="text-muted-foreground mt-2 max-w-2xl text-sm">{description}</p>
          )}
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
    </>
  );
}
