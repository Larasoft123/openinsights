/**
 * Create Project Dialog Component
 *
 * Modal dialog for creating a new project.
 * Supports creating blank projects or from presets.
 * Follows Modern Smart Home Dashboard modal pattern.
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { X, ChevronDown, Check, Sparkles, Tags, FileText, Wand2, Search } from 'lucide-react';
import {
  SUPPORTED_LANGUAGES,
  DEFAULT_LANGUAGE,
  type LanguageCode,
} from '@/lib/constants/languages';

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
  const [languageDropdownOpen, setLanguageDropdownOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Preset selection state
  // undefined = not selected, null = blank project, string = preset id
  const [presets, setPresets] = useState<PresetSummary[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null | undefined>(undefined);
  const [isLoadingPresets, setIsLoadingPresets] = useState(false);
  const [presetDropdownOpen, setPresetDropdownOpen] = useState(false);
  const [presetSearch, setPresetSearch] = useState('');
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

  // Handle ESC key to close dialog
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

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
        // Apply preset to create project
        const response = await fetch(`/api/presets/${selectedPresetId}/apply`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workspaceId: 'default', // Will be replaced by actual workspace from auth
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
        // Create blank project
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
    setPresetDropdownOpen(false);
    setPresetSearch('');
    setError(null);
    onClose();
  };

  const handleSelectPreset = (presetId: string | null | undefined) => {
    setSelectedPresetId(presetId);
    setPresetDropdownOpen(false);
    setPresetSearch('');
  };

  if (!isOpen) return null;

  // Use portal to render at document.body level, fixing backdrop coverage issues
  if (typeof document === 'undefined') return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={handleClose} />

      {/* Dialog */}
      <div className="fixed top-1/2 left-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 px-4">
        <div className="max-h-[90vh] overflow-hidden rounded-2xl border border-gray-800 bg-gray-900 shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-800 p-6">
            <h2 className="text-xl font-semibold text-white">Create New Project</h2>
            <button
              onClick={handleClose}
              className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
            >
              <X size={20} />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="max-h-[calc(90vh-80px)] overflow-y-auto p-6">
            <div className="space-y-5">
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

              {/* Preset Selection Dropdown */}
              <div>
                <label className="mb-2 block text-sm font-medium text-white">
                  Start from Preset
                </label>
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
                      ) : selectedPresetId === null ? (
                        'Blank Project'
                      ) : (
                        <span className="text-gray-400">Select a preset...</span>
                      )}
                    </span>
                    <ChevronDown
                      size={16}
                      className={`text-gray-400 transition-transform ${presetDropdownOpen ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {presetDropdownOpen && (
                    <div className="absolute right-0 left-0 z-10 mt-1 overflow-hidden rounded-lg border border-gray-800 bg-gray-950 shadow-lg">
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
                              <PresetDropdownOption
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
                            <div className="mt-2 px-4 py-1.5 text-xs font-medium text-gray-500">
                              My Presets
                            </div>
                            {personalPresets.map((preset) => (
                              <PresetDropdownOption
                                key={preset.id}
                                preset={preset}
                                isSelected={selectedPresetId === preset.id}
                                onSelect={() => handleSelectPreset(preset.id)}
                              />
                            ))}
                          </>
                        )}

                        {/* Blank Project Option - at the end */}
                        {!presetSearch && (
                          <>
                            <div className="mt-2 border-t border-gray-800 pt-2">
                              <button
                                type="button"
                                onClick={() => handleSelectPreset(null)}
                                className={`flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm transition-colors ${
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
                                  {selectedPresetId === null && (
                                    <Check size={10} className="text-white" />
                                  )}
                                </div>
                                <span>Blank Project</span>
                                <span className="ml-auto text-xs text-gray-500">
                                  Start from scratch
                                </span>
                              </button>
                            </div>
                          </>
                        )}

                        {/* No results */}
                        {presetSearch &&
                          officialPresets.length === 0 &&
                          personalPresets.length === 0 && (
                            <div className="px-4 py-3 text-center text-sm text-gray-500">
                              No presets found for &quot;{presetSearch}&quot;
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

              {/* Language Dropdown */}
              <div>
                <label htmlFor="language" className="mb-2 block text-sm font-medium text-white">
                  Default Language
                </label>
                <p className="mb-2 text-xs text-gray-500">
                  Language for transcribing sources in this project
                </p>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setLanguageDropdownOpen(!languageDropdownOpen)}
                    className="focus:border-accent-primary flex w-full items-center justify-between rounded-lg border border-gray-800 bg-gray-950 px-4 py-2.5 text-white transition-colors outline-none hover:border-gray-700"
                  >
                    <span>
                      {SUPPORTED_LANGUAGES.find((l) => l.code === language)?.name ||
                        'Select language'}
                    </span>
                    <ChevronDown
                      size={16}
                      className={`text-gray-400 transition-transform ${languageDropdownOpen ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {languageDropdownOpen && (
                    <div className="absolute right-0 left-0 z-10 mt-1 max-h-60 overflow-auto rounded-lg border border-gray-800 bg-gray-950 py-1 shadow-lg">
                      {SUPPORTED_LANGUAGES.map((lang) => (
                        <button
                          key={lang.code}
                          type="button"
                          onClick={() => {
                            setLanguage(lang.code);
                            setLanguageDropdownOpen(false);
                          }}
                          className={`flex w-full items-center gap-2 px-4 py-2 text-left text-sm transition-colors ${
                            language === lang.code
                              ? 'bg-accent-primary/20 text-white'
                              : 'text-gray-300 hover:bg-gray-800'
                          }`}
                        >
                          {lang.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="rounded-lg border border-red-900 bg-red-950/50 p-3 text-sm text-red-400">
                  {error}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="mt-6 flex gap-3">
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
            </div>
          </form>
        </div>
      </div>
    </>,
    document.body
  );
}

// Helper component for preset dropdown option
function PresetDropdownOption({
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
