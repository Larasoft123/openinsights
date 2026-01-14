/**
 * Source Details Dialog Component
 *
 * Modal dialog for viewing and editing source details:
 * - Source name (editable with auto-save)
 * - Description (editable with auto-save)
 * - Language (read-only display)
 * - Custom metadata fields
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useDebouncedSave } from '@/lib/hooks';
import { Globe } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { MetadataForm } from '@/components/metadata';
import { getLanguageName, LANGUAGE_AUTO } from '@/lib/constants/languages';

interface SourceDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceId: string;
  projectId: string;
  initialTitle: string;
  initialDescription?: string | null;
  language?: string;
  detectedLanguage?: string | null;
  onTitleChange?: (newTitle: string) => void;
}

export function SourceDetailsDialog({
  open,
  onOpenChange,
  sourceId,
  projectId,
  initialTitle,
  initialDescription,
  language,
  detectedLanguage,
  onTitleChange,
}: SourceDetailsDialogProps) {
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription ?? '');

  // Get language display info
  const getLanguageDisplay = () => {
    if (!language) return null;

    // If auto-detect was used and we have a detected language
    if (language === LANGUAGE_AUTO && detectedLanguage) {
      return {
        name: getLanguageName(detectedLanguage),
        suffix: 'auto-detected',
      };
    }

    // If a specific language was set (not auto)
    if (language !== LANGUAGE_AUTO) {
      return {
        name: getLanguageName(language),
        suffix: null,
      };
    }

    return null;
  };

  const languageDisplay = getLanguageDisplay();

  // Save function (called by useDebouncedSave hook)
  const saveChanges = useCallback(async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      throw new Error('Source name is required');
    }

    const res = await fetch(`/api/projects/${projectId}/sources/${sourceId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: trimmedTitle,
        description: description || null,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to save');
    }

    // Notify parent of title change for UI refresh
    if (onTitleChange && trimmedTitle !== initialTitle) {
      onTitleChange(trimmedTitle);
    }
  }, [projectId, sourceId, title, description, initialTitle, onTitleChange]);

  // Auto-save with debounce - hook handles toast notifications
  const { isSaving, resetInitialMount } = useDebouncedSave(saveChanges, [title, description]);

  // Reset form when dialog opens with new data
  useEffect(() => {
    if (open) {
      // Intentional: reset form state when dialog reopens
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTitle(initialTitle);
      setDescription(initialDescription ?? '');
      resetInitialMount();
    }
  }, [open, initialTitle, initialDescription, resetInitialMount]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Source Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Source Name */}
          <div className="space-y-2">
            <label htmlFor="source-title" className="text-sm font-medium text-white">
              Name
            </label>
            <Input
              id="source-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Source name"
              className="bg-gray-950"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label htmlFor="source-description" className="text-sm font-medium text-white">
              Description
            </label>
            <textarea
              id="source-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description for this source..."
              rows={3}
              className="focus:border-accent-primary w-full rounded-lg border border-gray-800 bg-gray-950 px-4 py-2.5 text-white placeholder-gray-500 transition-colors outline-none"
            />
          </div>

          {/* Language (read-only) */}
          {languageDisplay && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-white">Language</label>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 rounded-lg border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-300">
                  <Globe size={14} className="text-gray-400" />
                  <span>{languageDisplay.name}</span>
                  {languageDisplay.suffix && (
                    <span className="text-xs text-gray-500">({languageDisplay.suffix})</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Divider */}
          <div className="border-t border-gray-800" />

          {/* Custom Fields */}
          <div>
            <h3 className="mb-3 text-sm font-medium text-white">Custom Fields</h3>
            <MetadataForm
              entityType="SOURCE"
              entityId={sourceId}
              parentId={projectId}
              showCard={false}
              configureUrl={`/projects/${projectId}/settings#source-metadata`}
            />
          </div>
        </div>

        {/* Saving indicator */}
        {isSaving && <div className="absolute top-4 right-12 text-xs text-gray-500">Saving...</div>}
      </DialogContent>
    </Dialog>
  );
}
