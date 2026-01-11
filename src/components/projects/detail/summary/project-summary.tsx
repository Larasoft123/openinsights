'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChevronDown, ChevronUp, RefreshCw, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ProjectSummaryData {
  researchObjectives: string[];
  keyFindings: string[];
  participantOverview: { count: number; description?: string };
  recommendations: string[];
  sourcesAnalyzed: number;
}

type SummaryStatus = 'PENDING' | 'GENERATING' | 'COMPLETED' | 'FAILED' | null;

interface ProjectSummaryProps {
  projectId: string;
  initialSummary?: ProjectSummaryData | null;
  initialStatus?: SummaryStatus;
  initialGeneratedAt?: Date | string | null;
  sourcesCount: number;
}

/**
 * ProjectSummary Component
 *
 * Displays AI-generated summary for a project including:
 * - Research objectives (inferred goals)
 * - Key findings (cross-session patterns)
 * - Participant overview
 * - Recommendations
 *
 * Features:
 * - Collapsible widget
 * - Manual regeneration button
 * - Loading states during generation
 * - Error handling with retry
 */
export function ProjectSummary({
  projectId,
  initialSummary,
  initialStatus,
  initialGeneratedAt,
  sourcesCount,
}: ProjectSummaryProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [summary, setSummary] = useState<ProjectSummaryData | null>(initialSummary ?? null);
  const [status, setStatus] = useState<SummaryStatus>(initialStatus ?? null);
  const [generatedAt, setGeneratedAt] = useState<Date | null>(
    initialGeneratedAt ? new Date(initialGeneratedAt) : null
  );
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Poll for summary status when generating
  useEffect(() => {
    if (status !== 'PENDING' && status !== 'GENERATING') return;

    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}/summary`);
        if (!res.ok) throw new Error('Failed to fetch summary');

        const data = await res.json();
        setSummary(data.summary);
        setStatus(data.status);
        setGeneratedAt(data.generatedAt ? new Date(data.generatedAt) : null);

        // Stop polling when complete or failed
        if (data.status === 'COMPLETED' || data.status === 'FAILED') {
          clearInterval(pollInterval);
        }
      } catch (err) {
        console.error('Failed to poll summary status:', err);
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [projectId, status]);

  // Handle regenerate
  const handleRegenerate = useCallback(async () => {
    setIsRegenerating(true);
    setError(null);

    try {
      const res = await fetch(`/api/projects/${projectId}/summary`, {
        method: 'POST',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to regenerate summary');
      }

      setStatus('PENDING');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to regenerate summary');
    } finally {
      setIsRegenerating(false);
    }
  }, [projectId]);

  // Don't show anything if no sources
  if (sourcesCount === 0) {
    return null;
  }

  // Render loading state
  const renderLoadingState = () => (
    <div className="text-muted-foreground flex items-center gap-2 text-sm">
      <Loader2 className="h-4 w-4 animate-spin" />
      <span>Generating project summary...</span>
    </div>
  );

  // Render error state
  const renderErrorState = () => (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-sm text-red-400">
        <AlertCircle className="h-4 w-4" />
        <span>{error || 'Failed to generate summary'}</span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleRegenerate}
        disabled={isRegenerating}
        className="cursor-pointer"
      >
        <RefreshCw className={cn('h-4 w-4', isRegenerating && 'animate-spin')} />
        <span className="ml-1">Retry</span>
      </Button>
    </div>
  );

  // Render empty state
  const renderEmptyState = () => (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground text-sm">
        No project summary available. Generate one to see insights across all sources.
      </span>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleRegenerate}
        disabled={isRegenerating}
        className="cursor-pointer"
      >
        <RefreshCw className={cn('h-4 w-4', isRegenerating && 'animate-spin')} />
        <span className="ml-1">Generate</span>
      </Button>
    </div>
  );

  // Render summary content
  const renderSummaryContent = () => {
    if (!summary) return renderEmptyState();

    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          {/* Research Objectives */}
          {summary.researchObjectives.length > 0 && (
            <div>
              <h4 className="mb-1 text-sm font-semibold text-white">Research Objectives</h4>
              <ul className="space-y-1">
                {summary.researchObjectives.map((objective, i) => (
                  <li key={i} className="text-muted-foreground flex items-start gap-2 text-sm">
                    <span className="bg-primary mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" />
                    <span>{objective}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Participant Overview */}
          <div>
            <h4 className="mb-1 text-sm font-semibold text-white">Participants</h4>
            <p className="text-muted-foreground text-sm">
              <span className="font-medium text-white">{summary.sourcesAnalyzed} sources</span>{' '}
              analyzed
              {summary.participantOverview.description && (
                <>. {summary.participantOverview.description}</>
              )}
            </p>
          </div>
        </div>

        {/* Key Findings */}
        {summary.keyFindings.length > 0 && (
          <div>
            <h4 className="mb-1 text-sm font-semibold text-white">Key Findings</h4>
            <ul className="space-y-1">
              {summary.keyFindings.map((finding, i) => (
                <li key={i} className="text-muted-foreground flex items-start gap-2 text-sm">
                  <span className="bg-primary mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" />
                  <span>{finding}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Recommendations */}
        {summary.recommendations.length > 0 && (
          <div>
            <h4 className="mb-1 text-sm font-semibold text-white">Recommendations</h4>
            <ul className="space-y-1">
              {summary.recommendations.map((rec, i) => (
                <li key={i} className="text-muted-foreground flex items-start gap-2 text-sm">
                  <span className="bg-primary mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" />
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Footer with metadata and regenerate button */}
        <div className="border-border text-muted-foreground flex items-center justify-between border-t pt-3 text-xs">
          <span>
            {generatedAt
              ? `Generated ${generatedAt.toLocaleDateString()} at ${generatedAt.toLocaleTimeString()}`
              : 'Generated'}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRegenerate}
            disabled={isRegenerating || status === 'GENERATING'}
            className="h-6 cursor-pointer px-2 text-xs"
          >
            <RefreshCw
              className={cn(
                'mr-1 h-3 w-3',
                (isRegenerating || status === 'GENERATING') && 'animate-spin'
              )}
            />
            Regenerate
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="mt-4 border-t border-gray-800 pt-4">
      {/* Header - clickable to expand/collapse, matches design system */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="mb-2 flex w-full cursor-pointer items-center justify-between"
      >
        <h3 className="text-xs font-medium tracking-wide text-gray-400 uppercase">
          AI Project Summary
        </h3>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-gray-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-400" />
        )}
      </button>

      {/* Content */}
      {isExpanded && (
        <div>
          {status === 'PENDING' || status === 'GENERATING'
            ? renderLoadingState()
            : status === 'FAILED' || error
              ? renderErrorState()
              : renderSummaryContent()}
        </div>
      )}
    </div>
  );
}
