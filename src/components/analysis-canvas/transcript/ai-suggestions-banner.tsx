'use client';

import { AlertCircle, Sparkles, CheckCircle2, Clock } from 'lucide-react';
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
      <div className="m-4 mb-0 flex items-center gap-4 rounded-lg border border-blue-500/50 bg-blue-500/10 p-3">
        <Sparkles className="h-5 w-5 flex-shrink-0 text-blue-400" />

        <div className="flex flex-1 items-center gap-4 text-sm">
          <span className="text-gray-300">
            AI suggested <strong className="text-white">{stats.total}</strong> highlights
          </span>

          {hasApproved && (
            <div className="flex items-center gap-1 text-green-400">
              <CheckCircle2 className="h-4 w-4" />
              <span className="font-medium">{stats.approved}</span>
              <span className="text-gray-400">approved</span>
            </div>
          )}

          {hasPending && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClickPending}
              className="flex h-auto items-center gap-1 p-0 text-yellow-400 hover:bg-transparent hover:text-yellow-300"
            >
              <Clock className="h-4 w-4" />
              <span className="font-medium">{stats.pending}</span>
              <span className="text-gray-400">to review</span>
            </Button>
          )}
        </div>

        {/* Bulk action buttons */}
        {hasPending && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onApproveAll}
              className="border-green-600/50 bg-green-600/10 text-green-400 hover:bg-green-600/20 hover:text-green-300"
            >
              Approve All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onRejectAll}
              className="border-red-600/50 bg-red-600/10 text-red-400 hover:bg-red-600/20 hover:text-red-300"
            >
              Reject All
            </Button>
          </div>
        )}
      </div>
    );
  }

  return null;
}
