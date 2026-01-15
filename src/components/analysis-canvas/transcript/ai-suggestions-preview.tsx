'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import { Check, X, Sparkles, Loader2, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface AISuggestion {
  id: string;
  segmentId: string;
  tagNames: string[];
  selectedText: string | null;
  confidence: number | null;
  aiNote: string | null;
  segment: {
    id: string;
    content: string;
    startTime: number;
    endTime: number;
    speakerId: string | null;
  };
  matchedTags: Array<{
    id: string;
    name: string;
    color: string;
  }>;
  unmatchedTagNames: string[];
}

interface AISuggestionsPreviewProps {
  sourceId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * AISuggestionsPreview Component
 *
 * Modal for reviewing and approving/rejecting AI-generated highlight suggestions.
 * Displays each suggestion with:
 * - Segment content and timestamp
 * - Suggested tags (matched and unmatched)
 * - AI confidence score
 * - AI reasoning (note)
 * - Approve/Reject actions per suggestion
 * - Batch approve/reject all actions
 */
export function AISuggestionsPreview({ sourceId, open, onOpenChange }: AISuggestionsPreviewProps) {
  const router = useRouter();
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);

  // Fetch suggestions when dialog opens
  useEffect(() => {
    if (!open) return;

    const fetchSuggestions = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/sources/${sourceId}/ai-suggestions`);
        if (!response.ok) {
          throw new Error('Failed to fetch suggestions');
        }
        const data = await response.json();
        setSuggestions(data.suggestions ?? []);
      } catch (error) {
        console.error('Failed to fetch AI suggestions:', error);
        toast.error('Failed to load AI suggestions');
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    };

    void fetchSuggestions();
  }, [sourceId, open]);

  const handleApproveSuggestion = async (suggestionId: string) => {
    try {
      setProcessingIds((prev) => new Set(prev).add(suggestionId));
      const response = await fetch(
        `/api/sources/${sourceId}/ai-suggestions/${suggestionId}/approve`,
        {
          method: 'POST',
        }
      );

      if (!response.ok) {
        throw new Error('Failed to approve suggestion');
      }

      const data = await response.json();
      toast.success(`Created ${data.highlightCount} highlight(s)`);

      // Remove from list
      setSuggestions((prev) => prev.filter((s) => s.id !== suggestionId));
    } catch (error) {
      console.error('Failed to approve suggestion:', error);
      toast.error('Failed to approve suggestion');
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(suggestionId);
        return next;
      });
    }
  };

  const handleRejectSuggestion = async (suggestionId: string) => {
    try {
      setProcessingIds((prev) => new Set(prev).add(suggestionId));
      const response = await fetch(
        `/api/sources/${sourceId}/ai-suggestions/${suggestionId}/reject`,
        {
          method: 'POST',
        }
      );

      if (!response.ok) {
        throw new Error('Failed to reject suggestion');
      }

      toast.success('Suggestion rejected');

      // Remove from list
      setSuggestions((prev) => prev.filter((s) => s.id !== suggestionId));
    } catch (error) {
      console.error('Failed to reject suggestion:', error);
      toast.error('Failed to reject suggestion');
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(suggestionId);
        return next;
      });
    }
  };

  const handleApproveAll = async () => {
    try {
      setIsBatchProcessing(true);
      const response = await fetch(`/api/sources/${sourceId}/ai-suggestions/approve-all`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to approve all suggestions');
      }

      const data = await response.json();
      toast.success(data.message);

      // Clear list and close dialog
      setSuggestions([]);
      onOpenChange(false);

      // Refresh page to show new highlights
      router.refresh();
    } catch (error) {
      console.error('Failed to approve all:', error);
      toast.error('Failed to approve all suggestions');
    } finally {
      setIsBatchProcessing(false);
    }
  };

  const handleRejectAll = async () => {
    try {
      setIsBatchProcessing(true);
      const response = await fetch(`/api/sources/${sourceId}/ai-suggestions/reject-all`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to reject all suggestions');
      }

      const data = await response.json();
      toast.success(data.message);

      // Clear list and close dialog
      setSuggestions([]);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to reject all:', error);
      toast.error('Failed to reject all suggestions');
    } finally {
      setIsBatchProcessing(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-400" />
            AI Highlight Suggestions
          </DialogTitle>
          <DialogDescription>
            Review AI-generated highlights and approve or reject each suggestion.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : suggestions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="mb-4 h-12 w-12 text-gray-500" />
            <p className="text-sm text-gray-400">No pending suggestions</p>
          </div>
        ) : (
          <>
            {/* Batch actions */}
            <div className="flex items-center justify-between border-b border-gray-800 pb-4">
              <p className="text-sm text-gray-400">
                {suggestions.length} suggestion{suggestions.length !== 1 ? 's' : ''} pending
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRejectAll}
                  disabled={isBatchProcessing}
                >
                  {isBatchProcessing ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <X className="mr-2 h-4 w-4" />
                  )}
                  Reject All
                </Button>
                <Button size="sm" onClick={handleApproveAll} disabled={isBatchProcessing}>
                  {isBatchProcessing ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="mr-2 h-4 w-4" />
                  )}
                  Approve All
                </Button>
              </div>
            </div>

            {/* Suggestions list */}
            <div className="max-h-[60vh] overflow-y-auto">
              <div className="space-y-4 pr-4">
                {suggestions.map((suggestion) => {
                  const isProcessing = processingIds.has(suggestion.id);
                  const hasUnmatchedTags = suggestion.unmatchedTagNames.length > 0;

                  return (
                    <div
                      key={suggestion.id}
                      className="rounded-lg border border-gray-800 bg-gray-900/50 p-4"
                    >
                      {/* Segment info */}
                      <div className="mb-3">
                        <div className="mb-1 flex items-center gap-2 text-xs text-gray-500">
                          <span>
                            {formatTime(suggestion.segment.startTime)} -{' '}
                            {formatTime(suggestion.segment.endTime)}
                          </span>
                          {suggestion.segment.speakerId && (
                            <span>• Speaker {suggestion.segment.speakerId}</span>
                          )}
                          {suggestion.confidence !== null && (
                            <span>• {Math.round(suggestion.confidence * 100)}% confident</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-300">
                          {suggestion.selectedText || suggestion.segment.content}
                        </p>
                      </div>

                      {/* Suggested tags */}
                      <div className="mb-3 flex flex-wrap gap-2">
                        {suggestion.matchedTags.map((tag) => (
                          <Badge
                            key={tag.id}
                            variant="outline"
                            style={{
                              borderColor: tag.color,
                              backgroundColor: `${tag.color}20`,
                            }}
                          >
                            {tag.name}
                          </Badge>
                        ))}
                        {suggestion.unmatchedTagNames.map((tagName) => (
                          <Badge key={tagName} variant="outline" className="border-red-500/50">
                            {tagName} (not found)
                          </Badge>
                        ))}
                      </div>

                      {/* AI note */}
                      {suggestion.aiNote && (
                        <p className="mb-3 text-xs text-gray-500 italic">{suggestion.aiNote}</p>
                      )}

                      {/* Warning for unmatched tags */}
                      {hasUnmatchedTags && (
                        <p className="mb-3 text-xs text-yellow-500">
                          Some suggested tags do not exist in your project
                        </p>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRejectSuggestion(suggestion.id)}
                          disabled={isProcessing}
                        >
                          {isProcessing ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <X className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleApproveSuggestion(suggestion.id)}
                          disabled={isProcessing || suggestion.matchedTags.length === 0}
                        >
                          {isProcessing ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
