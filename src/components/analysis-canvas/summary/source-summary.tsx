'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Loader2,
  AlertCircle,
  Quote,
  Users,
  Tag,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SourceSummaryData {
  keyTopics: string[];
  keyQuotes: { quote: string; speaker?: string }[];
  participants: { id?: string; role?: string }[];
  duration: number;
  segmentCount: number;
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

  // Render summary content
  const renderSummaryContent = () => {
    if (!summary) return renderEmptyState();

    return (
      <div className="space-y-4">
        {/* Key Topics */}
        {summary.keyTopics.length > 0 && (
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Tag className="text-muted-foreground h-3.5 w-3.5" />
              <h4 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                Key Topics
              </h4>
            </div>
            <ul className="space-y-1">
              {summary.keyTopics.map((topic, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="bg-primary mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" />
                  <span>{topic}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Key Quotes */}
        {summary.keyQuotes.length > 0 && (
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Quote className="text-muted-foreground h-3.5 w-3.5" />
              <h4 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                Key Quotes
              </h4>
            </div>
            <div className="space-y-2">
              {summary.keyQuotes.map((item, i) => (
                <blockquote
                  key={i}
                  className="border-primary/50 text-foreground/80 border-l-2 pl-3 text-sm italic"
                >
                  &ldquo;{item.quote}&rdquo;
                  {item.speaker && (
                    <span className="text-muted-foreground mt-1 block text-xs">
                      - {item.speaker}
                    </span>
                  )}
                </blockquote>
              ))}
            </div>
          </div>
        )}

        {/* Participants */}
        {summary.participants.length > 0 && (
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Users className="text-muted-foreground h-3.5 w-3.5" />
              <h4 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                Participants
              </h4>
            </div>
            <div className="flex flex-wrap gap-2">
              {summary.participants.map((p, i) => (
                <span
                  key={i}
                  className="bg-muted inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs"
                >
                  {p.id || `Speaker ${i + 1}`}
                  {p.role && <span className="text-muted-foreground">({p.role})</span>}
                </span>
              ))}
            </div>
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
    <div className="border-border border-t pt-4">
      {/* Header - clickable to expand/collapse */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="mb-2 flex w-full cursor-pointer items-center justify-between"
      >
        <h3 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          AI Summary
        </h3>
        {isExpanded ? (
          <ChevronUp className="text-muted-foreground h-4 w-4" />
        ) : (
          <ChevronDown className="text-muted-foreground h-4 w-4" />
        )}
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="bg-muted/30 rounded-lg p-3">
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
