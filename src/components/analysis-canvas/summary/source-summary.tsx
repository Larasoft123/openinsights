'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChevronDown, ChevronUp, RefreshCw, Loader2, AlertCircle, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// New narrative format
interface SourceSummaryData {
  narrative?: string;
  duration?: number;
  segmentCount?: number;
  // Legacy format fields (for backwards compatibility)
  keyTopics?: string[];
  keyQuotes?: { quote: string; speaker?: string }[];
  participants?: { id?: string; role?: string }[];
}

type SummaryStatus = 'PENDING' | 'GENERATING' | 'COMPLETED' | 'FAILED' | null;

interface SourceSummaryProps {
  sourceId: string;
  initialSummary?: SourceSummaryData | null;
  initialStatus?: SummaryStatus;
  initialGeneratedAt?: Date | string | null;
}

/**
 * SourceSummary Component
 *
 * Displays AI-generated summary for a source including:
 * - Key topics (themes discussed)
 * - Key quotes (notable statements)
 * - Participants (speakers and roles)
 *
 * Features:
 * - Collapsible widget
 * - Manual regeneration button
 * - Loading states during generation
 * - Error handling with retry
 */
export function SourceSummary({
  sourceId,
  initialSummary,
  initialStatus,
  initialGeneratedAt,
}: SourceSummaryProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [summary, setSummary] = useState<SourceSummaryData | null>(initialSummary ?? null);
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
        const res = await fetch(`/api/sources/${sourceId}/summary`);
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
  }, [sourceId, status]);

  // Handle regenerate
  const handleRegenerate = useCallback(async () => {
    setIsRegenerating(true);
    setError(null);

    try {
      const res = await fetch(`/api/sources/${sourceId}/summary`, {
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
  }, [sourceId]);

  // Render loading state
  const renderLoadingState = () => (
    <div className="text-muted-foreground flex items-center gap-2 text-sm">
      <Loader2 className="h-4 w-4 animate-spin" />
      <span>Generating summary...</span>
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
      <span className="text-muted-foreground text-sm">No summary available</span>
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

  /**
   * Parse and render the narrative with markdown-style bold headers
   * Converts **Topic Name** to styled headers
   */
  const renderNarrative = (narrative: string) => {
    // Split by bold markers and render appropriately
    const parts = narrative.split(/(\*\*[^*]+\*\*)/g);

    return parts.map((part, i) => {
      // Check if this is a bold header (wrapped in **)
      if (part.startsWith('**') && part.endsWith('**')) {
        const text = part.slice(2, -2);
        return (
          <h4 key={i} className="mt-3 mb-1 text-sm font-semibold text-white first:mt-0">
            {text}
          </h4>
        );
      }
      // Regular text - skip empty strings
      if (!part.trim()) return null;
      return (
        <p key={i} className="text-muted-foreground text-sm leading-relaxed">
          {part}
        </p>
      );
    });
  };

  /**
   * Render legacy format (keyTopics, keyQuotes) for backwards compatibility
   */
  const renderLegacyFormat = () => {
    if (!summary) return null;

    const topics = summary.keyTopics || [];

    return (
      <div className="space-y-2">
        {topics.length > 0 && (
          <div>
            <h4 className="mb-1 text-sm font-semibold text-white">Key Topics</h4>
            <ul className="space-y-1">
              {topics.map((topic, i) => (
                <li key={i} className="text-muted-foreground flex items-start gap-2 text-sm">
                  <span className="bg-primary mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" />
                  <span>{topic}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <p className="text-muted-foreground text-xs italic">
          This is a legacy summary format. Click Regenerate to create a new narrative summary.
        </p>
      </div>
    );
  };

  // Render summary content
  const renderSummaryContent = () => {
    if (!summary) return renderEmptyState();

    // Check if we have narrative (new format) or legacy format
    const hasNarrative =
      typeof summary.narrative === 'string' && summary.narrative.trim().length > 0;

    return (
      <div className="space-y-2">
        {/* Narrative content or legacy format */}
        <div className="prose prose-sm prose-invert max-w-none">
          {hasNarrative ? renderNarrative(summary.narrative!) : renderLegacyFormat()}
        </div>

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
    <div>
      {/* Header - clickable to expand/collapse */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="mb-3 flex w-full cursor-pointer items-center justify-between"
      >
        <h3 className="flex items-center gap-2 text-sm font-medium text-white">
          <Lightbulb className="h-4 w-4 text-yellow-400" />
          AI Summary
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
