/**
 * Apply Preset Dialog
 *
 * Allows applying a preset to an existing project.
 * Merge behavior:
 * - Tags: Add new tags (skip existing)
 * - Metadata fields: Add new fields (skip existing)
 * - AI prompts: Overwrite existing
 *
 * Uses Shadcn Dialog for consistent UX, accessibility, and ESC key handling.
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import {
  ChevronDown,
  Search,
  Sparkles,
  Tags,
  FileText,
  Wand2,
  Check,
  AlertTriangle,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface PresetSummary {
  id: string;
  name: string;
  description: string | null;
  category: string;
  isOfficial: boolean;
  preview: {
    tagCount: number;
    metadataFieldCount: number;
    hasAIPrompts: boolean;
  };
}

interface ApplyPresetDialogProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
  onApplied: () => void;
}

export function ApplyPresetDialog({
  projectId,
  isOpen,
  onClose,
  onApplied,
}: ApplyPresetDialogProps) {
  const [presets, setPresets] = useState<PresetSummary[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [isLoadingPresets, setIsLoadingPresets] = useState(false);
  const [presetDropdownOpen, setPresetDropdownOpen] = useState(false);
  const [presetSearch, setPresetSearch] = useState('');
  const [isApplying, setIsApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const presetSearchRef = useRef<HTMLInputElement>(null);

  // Fetch presets when dialog opens
  useEffect(() => {
    if (isOpen) {
      setIsLoadingPresets(true);
      fetch('/api/presets')
        .then((res) => res.json())
        .then((data) => {
          setPresets(data.presets || []);
        })
        .catch((err) => {
          console.error('Failed to fetch presets:', err);
        })
        .finally(() => {
          setIsLoadingPresets(false);
        });
    }
  }, [isOpen]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (presetDropdownOpen && presetSearchRef.current) {
      presetSearchRef.current.focus();
    }
  }, [presetDropdownOpen]);

  // Get selected preset details
  const selectedPreset = selectedPresetId ? presets.find((p) => p.id === selectedPresetId) : null;

  // Filter presets based on search
  const searchLower = presetSearch.toLowerCase();
  const filteredPresets = presets.filter(
    (p) =>
      p.name.toLowerCase().includes(searchLower) ||
      p.description?.toLowerCase().includes(searchLower) ||
      p.category.toLowerCase().includes(searchLower)
  );
  const officialPresets = filteredPresets.filter((p) => p.isOfficial);
  const personalPresets = filteredPresets.filter((p) => !p.isOfficial);

  const handleApply = async () => {
    if (!selectedPresetId) return;

    setError(null);
    setIsApplying(true);

    try {
      const response = await fetch(`/api/projects/${projectId}/apply-preset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ presetId: selectedPresetId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to apply preset');
      }

      const result = await response.json();

      // Show success toast with summary
      const summary: string[] = [];
      if (result.applied.tags.added > 0) {
        summary.push(`${result.applied.tags.added} tags added`);
      }
      if (result.applied.tags.skipped > 0) {
        summary.push(`${result.applied.tags.skipped} tags skipped (already exist)`);
      }
      if (result.applied.metadataFields.added > 0) {
        summary.push(`${result.applied.metadataFields.added} fields added`);
      }
      if (result.applied.metadataFields.skipped > 0) {
        summary.push(`${result.applied.metadataFields.skipped} fields skipped`);
      }
      if (result.applied.aiPrompts) {
        summary.push('AI prompts updated');
      }

      toast.success(
        `Preset "${result.appliedPreset.name}" applied`,
        summary.length > 0 ? { description: summary.join(', ') } : undefined
      );

      onApplied();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to apply preset');
    } finally {
      setIsApplying(false);
    }
  };

  const handleClose = () => {
    setSelectedPresetId(null);
    setPresetDropdownOpen(false);
    setPresetSearch('');
    setError(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Apply Preset</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Warning */}
          <div className="flex gap-3 rounded-lg border border-amber-900/50 bg-amber-950/30 p-3">
            <AlertTriangle size={20} className="shrink-0 text-amber-500" />
            <div className="text-sm">
              <p className="font-medium text-amber-400">Merge behavior</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-4 text-gray-400">
                <li>Tags and fields: Added if they don&apos;t exist</li>
                <li>AI prompts: Will overwrite existing prompts</li>
              </ul>
            </div>
          </div>

          {/* Preset Dropdown */}
          <div>
            <label className="mb-2 block text-sm font-medium text-white">Select Preset</label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setPresetDropdownOpen(!presetDropdownOpen)}
                disabled={isLoadingPresets}
                className="focus:border-accent-primary flex w-full items-center justify-between rounded-lg border border-gray-800 bg-gray-950 px-4 py-2.5 text-white transition-colors outline-none hover:border-gray-700 disabled:cursor-wait disabled:opacity-50"
              >
                <span className="flex items-center gap-2">
                  {isLoadingPresets ? (
                    'Loading presets...'
                  ) : selectedPreset ? (
                    selectedPreset.name
                  ) : (
                    <span className="text-gray-400">Choose a preset...</span>
                  )}
                </span>
                <ChevronDown
                  size={16}
                  className={`text-gray-400 transition-transform ${presetDropdownOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {presetDropdownOpen && (
                <div className="absolute right-0 bottom-full left-0 z-10 mb-1 overflow-hidden rounded-lg border border-gray-800 bg-gray-950 shadow-lg">
                  {/* Search Input */}
                  <div className="border-b border-gray-800 p-2">
                    <div className="relative">
                      <Search
                        size={16}
                        className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-500"
                      />
                      <input
                        ref={presetSearchRef}
                        type="text"
                        value={presetSearch}
                        onChange={(e) => setPresetSearch(e.target.value)}
                        placeholder="Search presets..."
                        className="w-full rounded-md border border-gray-700 bg-gray-900 py-2 pr-3 pl-9 text-sm text-white placeholder-gray-500 outline-none focus:border-gray-600"
                      />
                    </div>
                  </div>

                  {/* Dropdown Options */}
                  <div className="max-h-64 overflow-y-auto py-1">
                    {/* OpenInsights Presets */}
                    {officialPresets.length > 0 && (
                      <>
                        <div className="flex items-center gap-1 px-4 py-1.5 text-xs font-medium text-gray-500">
                          <Sparkles size={12} className="text-amber-500" />
                          OpenInsights Presets
                        </div>
                        {officialPresets.map((preset) => (
                          <PresetOption
                            key={preset.id}
                            preset={preset}
                            isSelected={selectedPresetId === preset.id}
                            onSelect={() => {
                              setSelectedPresetId(preset.id);
                              setPresetDropdownOpen(false);
                              setPresetSearch('');
                            }}
                          />
                        ))}
                      </>
                    )}

                    {/* Personal Presets */}
                    {personalPresets.length > 0 && (
                      <>
                        <div className="mt-2 px-4 py-1.5 text-xs font-medium text-gray-500">
                          My Presets
                        </div>
                        {personalPresets.map((preset) => (
                          <PresetOption
                            key={preset.id}
                            preset={preset}
                            isSelected={selectedPresetId === preset.id}
                            onSelect={() => {
                              setSelectedPresetId(preset.id);
                              setPresetDropdownOpen(false);
                              setPresetSearch('');
                            }}
                          />
                        ))}
                      </>
                    )}

                    {/* No results */}
                    {filteredPresets.length === 0 && (
                      <div className="px-4 py-3 text-center text-sm text-gray-500">
                        {presetSearch
                          ? `No presets found for "${presetSearch}"`
                          : 'No presets available'}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Selected Preset Preview */}
          {selectedPreset && (
            <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-3">
              <p className="mb-1 text-sm font-medium text-white">{selectedPreset.name}</p>
              {selectedPreset.description && (
                <p className="mb-2 text-xs text-gray-400">{selectedPreset.description}</p>
              )}
              <div className="flex flex-wrap gap-2 text-xs">
                {selectedPreset.preview.tagCount > 0 && (
                  <span className="flex items-center gap-1 rounded bg-gray-700 px-2 py-1 text-gray-300">
                    <Tags size={12} />
                    {selectedPreset.preview.tagCount} tags
                  </span>
                )}
                {selectedPreset.preview.metadataFieldCount > 0 && (
                  <span className="flex items-center gap-1 rounded bg-gray-700 px-2 py-1 text-gray-300">
                    <FileText size={12} />
                    {selectedPreset.preview.metadataFieldCount} fields
                  </span>
                )}
                {selectedPreset.preview.hasAIPrompts && (
                  <span className="flex items-center gap-1 rounded bg-gray-700 px-2 py-1 text-gray-300">
                    <Wand2 size={12} />
                    AI prompts
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="rounded-lg border border-red-900 bg-red-950/50 p-3 text-sm text-red-400">
              {error}
            </div>
          )}
        </div>

        <DialogFooter className="gap-3 sm:gap-3">
          <button
            type="button"
            onClick={handleClose}
            className="flex-1 rounded-lg border border-gray-800 bg-gray-950 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={isApplying || !selectedPresetId}
            className="bg-accent-primary hover:bg-accent-primary/90 flex-1 rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isApplying ? 'Applying...' : 'Apply Preset'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PresetOption({
  preset,
  isSelected,
  onSelect,
}: {
  preset: PresetSummary;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full items-start gap-2 px-4 py-2.5 text-left text-sm transition-colors ${
        isSelected ? 'bg-accent-primary/20 text-white' : 'text-gray-300 hover:bg-gray-800'
      }`}
    >
      <div
        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
          isSelected ? 'border-accent-primary bg-accent-primary' : 'border-gray-600'
        }`}
      >
        {isSelected && <Check size={10} className="text-white" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium">{preset.name}</span>
        </div>
        {preset.description && (
          <p className="mt-0.5 line-clamp-1 text-xs text-gray-500">{preset.description}</p>
        )}
      </div>
    </button>
  );
}
