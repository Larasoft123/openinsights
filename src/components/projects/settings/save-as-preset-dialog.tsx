/**
 * Save as Preset Dialog Component
 *
 * Modal for saving a project's configuration as a reusable preset.
 */

'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { X, ChevronDown, Check } from 'lucide-react';

const PRESET_CATEGORIES = [
  { value: 'DISCOVERY', label: 'Discovery Research' },
  { value: 'USABILITY', label: 'Usability Testing' },
  { value: 'VOICE_OF_CUSTOMER', label: 'Voice of Customer' },
  { value: 'COMPETITIVE', label: 'Competitive Analysis' },
  { value: 'SALES', label: 'Sales Research' },
  { value: 'SUPPORT', label: 'Support Research' },
  { value: 'OTHER', label: 'Other' },
];

interface SaveAsPresetDialogProps {
  projectId: string;
  projectName: string;
  isOpen: boolean;
  onClose: () => void;
}

export function SaveAsPresetDialog({
  projectId,
  projectName,
  isOpen,
  onClose,
}: SaveAsPresetDialogProps) {
  const [name, setName] = useState(`${projectName} Preset`);
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('OTHER');
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);

  // Include options
  const [includeTags, setIncludeTags] = useState(true);
  const [includeMetadataFields, setIncludeMetadataFields] = useState(true);
  const [includeAIPrompts, setIncludeAIPrompts] = useState(true);
  const [includeProjectSettings, setIncludeProjectSettings] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/projects/${projectId}/save-as-preset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description: description || undefined,
          category,
          includeTags,
          includeMetadataFields,
          includeAIPrompts,
          includeProjectSettings,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save preset');
      }

      const result = await response.json();
      toast.success(`Preset "${result.preset.name}" created successfully`);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save preset');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setName(`${projectName} Preset`);
    setDescription('');
    setCategory('OTHER');
    setIncludeTags(true);
    setIncludeMetadataFields(true);
    setIncludeAIPrompts(true);
    setIncludeProjectSettings(true);
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  const inputClass =
    'w-full rounded-lg border border-gray-800 bg-gray-950 px-4 py-2.5 text-white placeholder-gray-500 transition-colors outline-none focus:border-accent-primary';

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={handleClose} />

      {/* Dialog */}
      <div className="fixed top-1/2 left-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 px-4">
        <div className="overflow-hidden rounded-2xl border border-gray-800 bg-gray-900 shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-800 p-6">
            <h2 className="text-xl font-semibold text-white">Save as Preset</h2>
            <button
              onClick={handleClose}
              className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
            >
              <X size={20} />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6">
            <div className="space-y-4">
              {/* Name Input */}
              <div>
                <label htmlFor="preset-name" className="mb-2 block text-sm font-medium text-white">
                  Preset Name *
                </label>
                <input
                  id="preset-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Usability Testing Setup"
                  required
                  className={inputClass}
                  autoFocus
                />
              </div>

              {/* Description Input */}
              <div>
                <label
                  htmlFor="preset-description"
                  className="mb-2 block text-sm font-medium text-white"
                >
                  Description
                </label>
                <textarea
                  id="preset-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What kind of research is this preset for?"
                  rows={2}
                  className={inputClass}
                />
              </div>

              {/* Category Dropdown */}
              <div>
                <label className="mb-2 block text-sm font-medium text-white">Category</label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setCategoryDropdownOpen(!categoryDropdownOpen)}
                    className={`${inputClass} flex items-center justify-between`}
                  >
                    <span>
                      {PRESET_CATEGORIES.find((c) => c.value === category)?.label ||
                        'Select category'}
                    </span>
                    <ChevronDown
                      size={16}
                      className={`text-gray-400 transition-transform ${categoryDropdownOpen ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {categoryDropdownOpen && (
                    <div className="absolute right-0 left-0 z-10 mt-1 max-h-60 overflow-auto rounded-lg border border-gray-800 bg-gray-950 py-1 shadow-lg">
                      {PRESET_CATEGORIES.map((cat) => (
                        <button
                          key={cat.value}
                          type="button"
                          onClick={() => {
                            setCategory(cat.value);
                            setCategoryDropdownOpen(false);
                          }}
                          className={`flex w-full items-center gap-2 px-4 py-2 text-left text-sm transition-colors ${
                            category === cat.value
                              ? 'bg-accent-primary/20 text-white'
                              : 'text-gray-300 hover:bg-gray-800'
                          }`}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Include Options */}
              <div>
                <label className="mb-2 block text-sm font-medium text-white">
                  Include in Preset
                </label>
                <div className="space-y-2">
                  <CheckboxOption
                    id="include-tags"
                    label="Tags"
                    description="Tag definitions with names, colors, and descriptions"
                    checked={includeTags}
                    onChange={setIncludeTags}
                  />
                  <CheckboxOption
                    id="include-metadata"
                    label="Metadata Fields"
                    description="Custom source fields (participant segment, device, etc.)"
                    checked={includeMetadataFields}
                    onChange={setIncludeMetadataFields}
                  />
                  <CheckboxOption
                    id="include-ai"
                    label="AI Prompts"
                    description="Custom guidelines for summaries and theme naming"
                    checked={includeAIPrompts}
                    onChange={setIncludeAIPrompts}
                  />
                  <CheckboxOption
                    id="include-settings"
                    label="Project Settings"
                    description="Project type, goals, and context"
                    checked={includeProjectSettings}
                    onChange={setIncludeProjectSettings}
                  />
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
                disabled={isSubmitting || !name.trim()}
                className="bg-accent-primary hover:bg-accent-primary/90 flex-1 rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? 'Saving...' : 'Save Preset'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

// Helper component for checkbox options
function CheckboxOption({
  id,
  label,
  description,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-800 bg-gray-950 p-3 transition-colors hover:border-gray-700"
    >
      <div
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
          checked ? 'border-accent-primary bg-accent-primary' : 'border-gray-600'
        }`}
        onClick={(e) => {
          e.preventDefault();
          onChange(!checked);
        }}
      >
        {checked && <Check size={12} className="text-white" />}
      </div>
      <input
        type="checkbox"
        id={id}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only"
      />
      <div>
        <span className="font-medium text-white">{label}</span>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
    </label>
  );
}
