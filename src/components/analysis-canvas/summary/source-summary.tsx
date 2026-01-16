'use client';

import { useState, useEffect } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { RegenerateSummaryPopover } from '@/components/ui/regenerate-summary-popover';
import { useShareContext } from '@/lib/contexts/read-only-context';

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
  projectId: string;
  initialSummary?: SourceSummaryData | null;
  initialStatus?: SummaryStatus;
  initialGeneratedAt?: Date | string | null;
}

/**
 * SourceSummary Component
 *
 * Displays AI-generated narrative summary for a source.
 *
 * Features:
 * - Narrative format with bold topic headers
 * - Manual regeneration button
 * - Loading states during generation
 * - Error handling with retry
 * - Backwards compatibility with legacy format
 */
export function SourceSummary({
  sourceId,
  projectId,
  initialSummary,
  initialStatus,
  initialGeneratedAt,
}: SourceSummaryProps) {
  const { canEdit } = useShareContext();
  const [summary, setSummary] = useState<SourceSummaryData | null>(initialSummary ?? null);
  const [status, setStatus] = useState<SummaryStatus>(initialStatus ?? null);
  const [generatedAt, setGeneratedAt] = useState<Date | null>(
    initialGeneratedAt ? new Date(initialGeneratedAt) : null
  );
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
      <RegenerateSummaryPopover
        type="source"
        projectId={projectId}
        sourceId={sourceId}
        onRegenerateSuccess={() => {
          setError(null);
          setStatus('PENDING');
        }}
      />
    </div>
  );

  // Render empty state
  const renderEmptyState = () => (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground text-sm">No summary available</span>
      <RegenerateSummaryPopover
        type="source"
        projectId={projectId}
        sourceId={sourceId}
        onRegenerateSuccess={() => setStatus('PENDING')}
      />
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

        {/* Footer with metadata and regenerate button - only in edit mode */}
        {canEdit && (
          <div className="border-border text-muted-foreground flex items-center justify-between border-t pt-3 text-xs">
            <span>
              {generatedAt
                ? `Generated ${generatedAt.toLocaleDateString()} at ${generatedAt.toLocaleTimeString()}`
                : 'Generated'}
            </span>
            <RegenerateSummaryPopover
              type="source"
              projectId={projectId}
              sourceId={sourceId}
              onRegenerateSuccess={() => setStatus('PENDING')}
              disabled={status === 'GENERATING'}
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      {/* Header - matches "Tags in this source" style */}
      <h3 className="mb-2 text-xs font-medium tracking-wide text-gray-400 uppercase">AI Summary</h3>

      {/* Content - always visible */}
      <div>
        {status === 'PENDING' || status === 'GENERATING'
          ? renderLoadingState()
          : status === 'FAILED' || error
            ? renderErrorState()
            : renderSummaryContent()}
      </div>
    </div>
  );
}
