/**
 * Create Project Dialog
 *
 * Clean implementation using proper Radix components:
 * - Radix Select for language dropdown
 * - Radix Popover for searchable preset selector
 *
 * No manual portals or pointer-events hacks needed.
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Sparkles, Tags, FileText, Wand2, Search, ChevronsUpDown } from 'lucide-react';
import {
  SUPPORTED_LANGUAGES,
  DEFAULT_LANGUAGE,
  type LanguageCode,
} from '@/lib/constants/languages';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

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

interface CreateProjectDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateProjectDialog({ isOpen, onClose }: CreateProjectDialogProps) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [language, setLanguage] = useState<LanguageCode>(DEFAULT_LANGUAGE);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Preset selection
  const [presets, setPresets] = useState<PresetSummary[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null | undefined>(undefined);
  const [isLoadingPresets, setIsLoadingPresets] = useState(false);
  const [presetPopoverOpen, setPresetPopoverOpen] = useState(false);
  const [presetSearch, setPresetSearch] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

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

  // Focus search when popover opens
  useEffect(() => {
    if (presetPopoverOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 0);
    }
  }, [presetPopoverOpen]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      let projectId: string;

      if (selectedPresetId) {
        const response = await fetch(`/api/presets/${selectedPresetId}/apply`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workspaceId: 'default',
            projectName: name,
            projectDescription: description || undefined,
            projectLanguage: language,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to create project from preset');
        }

        const result = await response.json();
        projectId = result.project.id;
      } else {
        const response = await fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, description, language }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to create project');
        }

        const project = await response.json();
        projectId = project.id;
      }

      router.push(`/projects/${projectId}`);
      router.refresh();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setName('');
    setDescription('');
    setLanguage(DEFAULT_LANGUAGE);
    setSelectedPresetId(undefined);
    setPresetPopoverOpen(false);
    setPresetSearch('');
    setError(null);
    onClose();
  };

  const handleSelectPreset = (presetId: string | null) => {
    setSelectedPresetId(presetId);
    setPresetPopoverOpen(false);
    setPresetSearch('');
  };

  // Display text for preset trigger
  const presetDisplayText = isLoadingPresets
    ? 'Loading presets...'
    : selectedPreset
      ? selectedPreset.name
      : selectedPresetId === null
        ? 'Blank Project'
        : 'Select a preset...';

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name Input */}
          <div>
            <label htmlFor="name" className="mb-2 block text-sm font-medium text-white">
              Project Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., User Research Q1 2024"
              required
              className="focus:border-accent-primary w-full rounded-lg border border-gray-800 bg-gray-950 px-4 py-2.5 text-white placeholder-gray-500 transition-colors outline-none"
              autoFocus
            />
          </div>

          {/* Preset Selection - Using Popover */}
          <div>
            <label className="mb-2 block text-sm font-medium text-white">Start from Preset</label>
            <Popover open={presetPopoverOpen} onOpenChange={setPresetPopoverOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  disabled={isLoadingPresets}
                  className="focus:border-accent-primary flex w-full items-center justify-between rounded-lg border border-gray-800 bg-gray-950 px-4 py-2.5 text-left text-white transition-colors outline-none hover:border-gray-700 disabled:cursor-wait disabled:opacity-50"
                >
                  <span
                    className={!selectedPreset && selectedPresetId !== null ? 'text-gray-400' : ''}
                  >
                    {presetDisplayText}
                  </span>
                  <ChevronsUpDown size={16} className="text-gray-400" />
                </button>
              </PopoverTrigger>
              <PopoverContent
                className="p-0"
                align="start"
                sideOffset={4}
                style={{ width: 'var(--radix-popover-trigger-width)' }}
              >
                {/* Search Input */}
                <div className="border-b border-gray-800 p-2">
                  <div className="relative">
                    <Search
                      size={16}
                      className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-500"
                    />
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={presetSearch}
                      onChange={(e) => setPresetSearch(e.target.value)}
                      placeholder="Search presets..."
                      className="w-full rounded-md border border-gray-700 bg-gray-900 py-2 pr-3 pl-9 text-sm text-white placeholder-gray-500 outline-none focus:border-gray-600"
                    />
                  </div>
                </div>

                {/* Options */}
                <div className="max-h-64 overflow-y-auto py-1">
                  {/* Official Presets */}
                  {officialPresets.length > 0 && (
                    <>
                      <div className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-500">
                        <Sparkles size={12} className="text-amber-500" />
                        OpenInsights Presets
                      </div>
                      {officialPresets.map((preset) => (
                        <PresetOption
                          key={preset.id}
                          preset={preset}
                          isSelected={selectedPresetId === preset.id}
                          onSelect={() => handleSelectPreset(preset.id)}
                        />
                      ))}
                    </>
                  )}

                  {/* Personal Presets */}
                  {personalPresets.length > 0 && (
                    <>
                      <div className="mt-2 px-3 py-1.5 text-xs font-medium text-gray-500">
                        My Presets
                      </div>
                      {personalPresets.map((preset) => (
                        <PresetOption
                          key={preset.id}
                          preset={preset}
                          isSelected={selectedPresetId === preset.id}
                          onSelect={() => handleSelectPreset(preset.id)}
                        />
                      ))}
                    </>
                  )}

                  {/* Blank Project Option */}
                  {!presetSearch && (
                    <div className="mt-2 border-t border-gray-800 pt-2">
                      <button
                        type="button"
                        onClick={() => handleSelectPreset(null)}
                        className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
                          selectedPresetId === null
                            ? 'bg-accent-primary/20 text-white'
                            : 'text-gray-300 hover:bg-gray-800'
                        }`}
                      >
                        <div
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                            selectedPresetId === null
                              ? 'border-accent-primary bg-accent-primary'
                              : 'border-gray-600'
                          }`}
                        >
                          {selectedPresetId === null && <Check size={10} className="text-white" />}
                        </div>
                        <span>Blank Project</span>
                        <span className="ml-auto text-xs text-gray-500">Start from scratch</span>
                      </button>
                    </div>
                  )}

                  {/* No results */}
                  {presetSearch && officialPresets.length === 0 && personalPresets.length === 0 && (
                    <div className="px-3 py-3 text-center text-sm text-gray-500">
                      No presets found for &quot;{presetSearch}&quot;
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
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

          {/* Description Input */}
          <div>
            <label htmlFor="description" className="mb-2 block text-sm font-medium text-white">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of your research project..."
              rows={2}
              className="focus:border-accent-primary w-full rounded-lg border border-gray-800 bg-gray-950 px-4 py-2.5 text-white placeholder-gray-500 transition-colors outline-none"
            />
          </div>

          {/* Language Dropdown - Using Radix Select */}
          <div>
            <label className="mb-2 block text-sm font-medium text-white">Default Language</label>
            <p className="mb-2 text-xs text-gray-500">
              Language for transcribing sources in this project
            </p>
            <Select value={language} onValueChange={(val) => setLanguage(val as LanguageCode)}>
              <SelectTrigger className="w-full border-gray-800 bg-gray-950 text-white">
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent className="border-gray-800 bg-gray-950">
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <SelectItem
                    key={lang.code}
                    value={lang.code}
                    className="text-gray-300 focus:bg-gray-800 focus:text-white"
                  >
                    {lang.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Error Message */}
          {error && (
            <div className="rounded-lg border border-red-900 bg-red-950/50 p-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <DialogFooter className="gap-3 sm:gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 rounded-lg border border-gray-800 bg-gray-950 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim() || selectedPresetId === undefined}
              className="bg-accent-primary hover:bg-accent-primary/90 flex-1 rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : 'Create Project'}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Helper component for preset option
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
      className={`flex w-full items-start gap-2 px-3 py-2 text-left text-sm transition-colors ${
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
        <span className="truncate font-medium">{preset.name}</span>
        {preset.description && (
          <p className="mt-0.5 line-clamp-1 text-xs text-gray-500">{preset.description}</p>
        )}
      </div>
    </button>
  );
}
