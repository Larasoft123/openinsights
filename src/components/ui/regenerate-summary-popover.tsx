'use client';

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface RegenerateSummaryPopoverProps {
  type: 'source' | 'project';
  projectId: string;
  sourceId?: string; // Required when type is 'source'
  onRegenerateSuccess?: () => void;
  disabled?: boolean;
  buttonClassName?: string;
}

/**
 * RegenerateSummaryPopover Component
 *
 * A button with popover that allows users to:
 * 1. View and edit the current AI summary guideline
 * 2. Save the guideline and regenerate the summary
 *
 * Works for both source summaries (sourceSummaryPrompt) and
 * project summaries (projectSummaryPrompt).
 *
 * Features:
 * - Character counter
 * - Loading states during fetch and save
 * - Error handling with toast notifications
 */
export function RegenerateSummaryPopover({
  type,
  projectId,
  sourceId,
  onRegenerateSuccess,
  disabled,
  buttonClassName,
}: RegenerateSummaryPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [guideline, setGuideline] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const guidelineField = type === 'source' ? 'sourceSummaryPrompt' : 'projectSummaryPrompt';
  const title = type === 'source' ? 'Regenerate Source Summary' : 'Regenerate Project Summary';
  const description =
    type === 'source'
      ? 'Edit the guideline to fine-tune how AI summarizes this source'
      : 'Edit the guideline to fine-tune how AI synthesizes insights across sources';
  const placeholder =
    type === 'source'
      ? 'E.g., Focus on pain points and feature requests. Highlight mentions of competitor products...'
      : 'E.g., Prioritize findings related to mobile experience. Group insights by user segment...';

  // Fetch current guideline when popover opens
  useEffect(() => {
    if (!isOpen) return;

    const fetchGuideline = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/projects/${projectId}`);
        if (!res.ok) throw new Error('Failed to fetch project');

        const data = await res.json();
        setGuideline(data[guidelineField] || '');
      } catch (err) {
        console.error('Failed to fetch guideline:', err);
        toast.error('Failed to load guideline');
      } finally {
        setIsLoading(false);
      }
    };

    fetchGuideline();
  }, [isOpen, projectId, guidelineField]);

  // Handle save and regenerate
  const handleSaveAndRegenerate = useCallback(async () => {
    setIsSaving(true);
    try {
      // Determine the regenerate endpoint based on type
      const endpoint =
        type === 'source'
          ? `/api/sources/${sourceId}/summary/regenerate`
          : `/api/projects/${projectId}/summary/regenerate`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guideline: guideline || null }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to regenerate');
      }

      toast.success('Summary regeneration started');
      setIsOpen(false);
      onRegenerateSuccess?.();
    } catch (err) {
      console.error('Failed to regenerate:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to regenerate');
    } finally {
      setIsSaving(false);
    }
  }, [type, projectId, sourceId, guideline, onRegenerateSuccess]);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          disabled={disabled}
          className={buttonClassName || 'h-6 cursor-pointer px-2 text-xs'}
        >
          <RefreshCw className="mr-1 h-3 w-3" />
          Regenerate
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 border-gray-700 bg-gray-900" align="end">
        <div className="space-y-4">
          {/* Header */}
          <div>
            <h4 className="font-medium text-white">{title}</h4>
            <p className="text-xs text-gray-400">{description}</p>
          </div>

          {/* Guideline textarea */}
          {isLoading ? (
            <div className="flex h-24 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            </div>
          ) : (
            <div className="space-y-1">
              <Textarea
                value={guideline}
                onChange={(e) => setGuideline(e.target.value)}
                placeholder={placeholder}
                className="h-24 resize-none border-gray-700 bg-gray-800 text-sm text-white placeholder:text-gray-500"
              />
              <div className="text-right text-xs text-gray-500">{guideline.length} characters</div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:bg-gray-800 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSaveAndRegenerate}
              disabled={isSaving || isLoading}
              className="bg-gray-700 text-white hover:bg-gray-600"
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save & Regenerate'
              )}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
