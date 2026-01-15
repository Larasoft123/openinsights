'use client';

import { AlertCircle, Sparkles, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AISuggestionsStats {
  total: number;
  approved: number;
  pending: number;
}

interface AISuggestionsStatusProps {
  autoTaggingStatus: string | null | undefined;
  stats: AISuggestionsStats | null;
  onClickPending?: () => void;
  onApproveAll?: () => void;
  onRejectAll?: () => void;
}

/**
 * AI Suggestions Status Banner
 *
 * Shows AI auto-tagging status and statistics:
 * - Processing status (PENDING, PROCESSING)
 * - Statistics (total, approved, pending) when PENDING_REVIEW or COMPLETED
 */
export function AISuggestionsProcessingStatus({
  autoTaggingStatus,
  stats,
  onClickPending,
  onApproveAll,
  onRejectAll,
}: AISuggestionsStatusProps) {
  // Processing states
  if (autoTaggingStatus === 'PENDING' || autoTaggingStatus === 'PROCESSING') {
    const statusText =
      autoTaggingStatus === 'PENDING' ? 'AI tagging queued...' : 'AI analyzing transcript...';

    return (
      <div className="m-4 mb-0 flex items-center gap-3 rounded-lg border border-gray-700 bg-gray-800/50 p-3">
        <AlertCircle className="h-4 w-4 flex-shrink-0 text-gray-400" />
        <span className="text-sm text-gray-400">{statusText}</span>
      </div>
    );
  }

  // Statistics display (PENDING_REVIEW or COMPLETED with stats)
  // Only show if there are pending suggestions (hide when all processed)
  if (stats && stats.pending > 0) {
    const hasApproved = stats.approved > 0;
    const hasPending = stats.pending > 0;

    return (
      <div className="m-4 mb-0 flex items-center gap-4 rounded-lg border border-gray-700 bg-gray-800/50 p-3">
        <Sparkles className="h-5 w-5 flex-shrink-0 text-gray-400" />

        <div className="flex flex-1 items-center gap-4 text-sm text-gray-300">
          <span>
            AI suggested <strong className="text-white">{stats.total}</strong> highlights
          </span>

          {hasApproved && (
            <span>
              <strong className="text-white">{stats.approved}</strong> approved
            </span>
          )}

          {hasPending && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClickPending}
              className="flex h-auto items-center gap-1 p-0 text-gray-300 hover:bg-transparent hover:text-white"
            >
              <strong className="text-white">{stats.pending}</strong>
              <span>to review</span>
            </Button>
          )}
        </div>

        {/* Bulk action buttons */}
        {hasPending && (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onApproveAll}
              className="text-gray-300 hover:bg-gray-800 hover:text-white"
            >
              <Check className="mr-1.5 h-4 w-4" />
              Approve All
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onRejectAll}
              className="text-gray-300 hover:bg-gray-800 hover:text-white"
            >
              <X className="mr-1.5 h-4 w-4" />
              Reject All
            </Button>
          </div>
        )}
      </div>
    );
  }

  return null;
}
