'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, Sparkles, X } from 'lucide-react';

interface AISuggestionsBannerProps {
  sourceId: string;
  autoTaggingStatus: string | null | undefined;
  onReviewClick: () => void;
}

/**
 * AISuggestionsBanner Component
 *
 * Displays a banner when AI suggestions are ready for review.
 * Shows when source.autoTaggingStatus === 'PENDING_REVIEW'
 */
export function AISuggestionsBanner({
  sourceId,
  autoTaggingStatus,
  onReviewClick,
}: AISuggestionsBannerProps) {
  const [suggestionsCount, setSuggestionsCount] = useState<number | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch suggestions count when status is PENDING_REVIEW
  useEffect(() => {
    if (autoTaggingStatus !== 'PENDING_REVIEW') {
      setSuggestionsCount(null);
      setIsDismissed(false);
      return;
    }

    const fetchCount = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/sources/${sourceId}/ai-suggestions`);
        if (!response.ok) {
          throw new Error('Failed to fetch suggestions');
        }
        const data = await response.json();
        setSuggestionsCount(data.suggestions?.length ?? 0);
      } catch (error) {
        console.error('Failed to fetch AI suggestions count:', error);
        setSuggestionsCount(0);
      } finally {
        setIsLoading(false);
      }
    };

    void fetchCount();
  }, [sourceId, autoTaggingStatus]);

  // Don't show banner if not pending review, dismissed, or loading
  if (
    autoTaggingStatus !== 'PENDING_REVIEW' ||
    isDismissed ||
    isLoading ||
    suggestionsCount === null
  ) {
    return null;
  }

  // Don't show if no suggestions
  if (suggestionsCount === 0) {
    return null;
  }

  return (
    <div className="m-4 mb-0 flex items-start gap-3 rounded-lg border border-blue-500/50 bg-blue-500/10 p-4">
      <Sparkles className="h-5 w-5 flex-shrink-0 text-blue-400" />
      <div className="flex flex-1 items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-300">
            AI suggested <strong className="text-white">{suggestionsCount} highlights</strong> for
            this transcript.
          </span>
          <Button size="sm" variant="outline" onClick={onReviewClick} className="ml-2">
            Review Suggestions
          </Button>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 hover:bg-transparent"
          onClick={() => setIsDismissed(true)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

/**
 * AI Suggestions Processing Status Indicator
 *
 * Shows when AI is processing suggestions (PENDING or PROCESSING status)
 */
export function AISuggestionsProcessingStatus({
  autoTaggingStatus,
}: {
  autoTaggingStatus: string | null | undefined;
}) {
  if (!autoTaggingStatus || autoTaggingStatus === 'COMPLETED' || autoTaggingStatus === 'FAILED') {
    return null;
  }

  if (autoTaggingStatus === 'PENDING_REVIEW') {
    return null; // Handled by AISuggestionsBanner
  }

  const statusText =
    autoTaggingStatus === 'PENDING'
      ? 'AI tagging queued...'
      : autoTaggingStatus === 'PROCESSING'
        ? 'AI analyzing transcript...'
        : 'Processing...';

  return (
    <div className="m-4 mb-0 flex items-center gap-3 rounded-lg border border-gray-700 bg-gray-800/50 p-3">
      <AlertCircle className="h-4 w-4 flex-shrink-0 text-gray-400" />
      <span className="text-sm text-gray-400">{statusText}</span>
    </div>
  );
}
