'use client';

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const MAX_GUIDELINE_LENGTH = 500;

interface RegenerateAutoTaggingPopoverProps {
  sourceId: string;
  projectId: string;
  onRegenerateSuccess?: () => void;
  disabled?: boolean;
}

/**
 * RegenerateAutoTaggingPopover Component
 *
 * A button with popover that allows users to:
 * 1. View and edit the current AI auto-tagging guideline
 * 2. Save the guideline and regenerate AI suggestions
 *
 * Features:
 * - Character counter (max 500 chars)
 * - Loading states during fetch and save
 * - Error handling with toast notifications
 */
export function RegenerateAutoTaggingPopover({
  sourceId,
  projectId,
  onRegenerateSuccess,
  disabled,
}: RegenerateAutoTaggingPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [guideline, setGuideline] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch current guideline when popover opens
  useEffect(() => {
    if (!isOpen) return;

    const fetchGuideline = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/projects/${projectId}`);
        if (!res.ok) throw new Error('Failed to fetch project');

        const data = await res.json();
        setGuideline(data.autoTaggingPrompt || '');
      } catch (err) {
        console.error('Failed to fetch guideline:', err);
        toast.error('Failed to load guideline');
      } finally {
        setIsLoading(false);
      }
    };

    fetchGuideline();
  }, [isOpen, projectId]);

  // Handle save and regenerate
  const handleSaveAndRegenerate = useCallback(async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/sources/${sourceId}/ai-suggestions/regenerate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guideline: guideline || null }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to regenerate');
      }

      toast.success('AI tagging queued for regeneration');
      setIsOpen(false);
      onRegenerateSuccess?.();
    } catch (err) {
      console.error('Failed to regenerate:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to regenerate');
    } finally {
      setIsSaving(false);
    }
  }, [sourceId, guideline, onRegenerateSuccess]);

  const remainingChars = MAX_GUIDELINE_LENGTH - guideline.length;
  const isOverLimit = remainingChars < 0;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          disabled={disabled}
          className="text-gray-300 hover:bg-gray-800 hover:text-white"
        >
          <RefreshCw className="mr-1.5 h-4 w-4" />
          Regenerate
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 border-gray-700 bg-gray-900" align="end">
        <div className="space-y-4">
          {/* Header */}
          <div>
            <h4 className="font-medium text-white">Regenerate AI Suggestions</h4>
            <p className="text-xs text-gray-400">
              Edit the guideline to fine-tune AI tagging behavior
            </p>
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
                placeholder="E.g., Focus on user pain points, feature requests, and emotional responses..."
                className="h-24 resize-none border-gray-700 bg-gray-800 text-sm text-white placeholder:text-gray-500"
              />
              <div
                className={`text-right text-xs ${isOverLimit ? 'text-red-400' : 'text-gray-500'}`}
              >
                {remainingChars} characters remaining
              </div>
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
              disabled={isSaving || isLoading || isOverLimit}
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
