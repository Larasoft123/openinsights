/**
 * Presets Page
 *
 * Dedicated page for managing project presets.
 * Primary focus: Community presets (coming soon)
 * Secondary: Personal presets management
 */

'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  Users,
  Sparkles,
  User,
  Tags,
  FileText,
  Wand2,
  Trash2,
  Pencil,
  MoreVertical,
  X,
  ChevronDown,
} from 'lucide-react';

interface PresetSummary {
  id: string;
  name: string;
  description: string | null;
  category: string;
  isOfficial: boolean;
  useCount: number;
  createdAt: string;
  preview: {
    tagCount: number;
    metadataFieldCount: number;
    hasAIPrompts: boolean;
  };
}

const PRESET_CATEGORIES = [
  { value: 'DISCOVERY', label: 'Discovery Research' },
  { value: 'USABILITY', label: 'Usability Testing' },
  { value: 'VOICE_OF_CUSTOMER', label: 'Voice of Customer' },
  { value: 'COMPETITIVE', label: 'Competitive Analysis' },
  { value: 'SALES', label: 'Sales Research' },
  { value: 'SUPPORT', label: 'Support Research' },
  { value: 'OTHER', label: 'Other' },
];

const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  PRESET_CATEGORIES.map((c) => [c.value, c.label])
);

export default function PresetsPage() {
  const [presets, setPresets] = useState<PresetSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingPreset, setEditingPreset] = useState<PresetSummary | null>(null);

  // Fetch presets on mount
  useEffect(() => {
    fetchPresets();
  }, []);

  const fetchPresets = async () => {
    try {
      const response = await fetch('/api/presets');
      const data = await response.json();
      setPresets(data.presets || []);
    } catch (error) {
      console.error('Failed to fetch presets:', error);
      toast.error('Failed to load presets');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (presetId: string, presetName: string) => {
    if (!confirm(`Are you sure you want to delete "${presetName}"?`)) {
      return;
    }

    setDeletingId(presetId);
    try {
      const response = await fetch(`/api/presets/${presetId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete preset');
      }

      setPresets((prev) => prev.filter((p) => p.id !== presetId));
      toast.success(`Preset "${presetName}" deleted`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete preset');
    } finally {
      setDeletingId(null);
    }
  };

  const handleUpdate = (updatedPreset: PresetSummary) => {
    setPresets((prev) => prev.map((p) => (p.id === updatedPreset.id ? updatedPreset : p)));
  };

  // Split presets
  const officialPresets = presets.filter((p) => p.isOfficial);
  const personalPresets = presets.filter((p) => !p.isOfficial);

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Presets</h1>
        <p className="mt-1 text-gray-400">
          Reusable project configurations with tags, metadata fields, and AI prompts
        </p>
      </div>

      {/* Community Presets - Coming Soon */}
      <section className="rounded-2xl border border-gray-800 bg-gray-900 p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/20">
            <Users size={20} className="text-purple-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Community Presets</h2>
            <p className="text-sm text-gray-400">
              Discover and share presets with the research community
            </p>
          </div>
        </div>
        <div className="mt-6 rounded-xl border border-dashed border-gray-700 bg-gray-800/30 p-8 text-center">
          <Users size={40} className="mx-auto text-gray-600" />
          <p className="mt-3 text-lg font-medium text-gray-400">Coming Soon</p>
          <p className="mt-1 text-sm text-gray-500">
            Share your presets with others and discover new research setups
          </p>
        </div>
      </section>

      {/* My Presets */}
      <section className="rounded-2xl border border-gray-800 bg-gray-900 p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/20">
            <User size={20} className="text-blue-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">My Presets</h2>
            <p className="text-sm text-gray-400">Your personal project presets</p>
          </div>
        </div>

        <div className="mt-6">
          {isLoading ? (
            <div className="py-8 text-center text-gray-500">Loading...</div>
          ) : personalPresets.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-700 bg-gray-800/30 p-8 text-center">
              <p className="text-gray-400">No personal presets yet</p>
              <p className="mt-1 text-sm text-gray-500">
                Save a project as preset from Project Settings to create one
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {personalPresets.map((preset) => (
                <PresetCard
                  key={preset.id}
                  preset={preset}
                  onEdit={() => setEditingPreset(preset)}
                  onDelete={() => handleDelete(preset.id, preset.name)}
                  isDeleting={deletingId === preset.id}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* OpenInsights Presets */}
      <section className="rounded-2xl border border-gray-800 bg-gray-900 p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20">
            <Sparkles size={20} className="text-amber-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">OpenInsights Presets</h2>
            <p className="text-sm text-gray-400">Curated presets for common research scenarios</p>
          </div>
        </div>

        <div className="mt-6">
          {isLoading ? (
            <div className="py-8 text-center text-gray-500">Loading...</div>
          ) : officialPresets.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-700 bg-gray-800/30 p-8 text-center">
              <p className="text-gray-400">No presets available</p>
            </div>
          ) : (
            <div className="space-y-3">
              {officialPresets.map((preset) => (
                <PresetCard key={preset.id} preset={preset} readOnly />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Edit Preset Dialog */}
      {editingPreset && (
        <EditPresetDialog
          preset={editingPreset}
          onClose={() => setEditingPreset(null)}
          onUpdate={handleUpdate}
        />
      )}
    </div>
  );
}

function PresetCard({
  preset,
  onEdit,
  onDelete,
  isDeleting,
  readOnly,
}: {
  preset: PresetSummary;
  onEdit?: () => void;
  onDelete?: () => void;
  isDeleting?: boolean;
  readOnly?: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex items-start justify-between rounded-xl border border-gray-800 bg-gray-950 p-4">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-white">{preset.name}</h3>
          <span className="rounded bg-gray-800 px-2 py-0.5 text-xs text-gray-400">
            {CATEGORY_LABELS[preset.category] || preset.category}
          </span>
        </div>
        {preset.description && (
          <p className="mt-1 line-clamp-2 text-sm text-gray-500">{preset.description}</p>
        )}
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          {preset.preview.tagCount > 0 && (
            <span className="flex items-center gap-1 rounded bg-gray-800 px-2 py-1 text-gray-400">
              <Tags size={12} />
              {preset.preview.tagCount} tags
            </span>
          )}
          {preset.preview.metadataFieldCount > 0 && (
            <span className="flex items-center gap-1 rounded bg-gray-800 px-2 py-1 text-gray-400">
              <FileText size={12} />
              {preset.preview.metadataFieldCount} fields
            </span>
          )}
          {preset.preview.hasAIPrompts && (
            <span className="flex items-center gap-1 rounded bg-gray-800 px-2 py-1 text-gray-400">
              <Wand2 size={12} />
              AI prompts
            </span>
          )}
          {preset.useCount > 0 && (
            <span className="text-gray-500">Used {preset.useCount} times</span>
          )}
        </div>
      </div>

      {/* Actions */}
      {!readOnly && (onEdit || onDelete) && (
        <div className="relative ml-4">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
          >
            <MoreVertical size={16} />
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 z-20 mt-1 w-36 rounded-lg border border-gray-800 bg-gray-900 py-1 shadow-lg">
                {onEdit && (
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onEdit();
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-800"
                  >
                    <Pencil size={14} />
                    Edit
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onDelete();
                    }}
                    disabled={isDeleting}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-400 hover:bg-gray-800 disabled:opacity-50"
                  >
                    <Trash2 size={14} />
                    {isDeleting ? 'Deleting...' : 'Delete'}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function EditPresetDialog({
  preset,
  onClose,
  onUpdate,
}: {
  preset: PresetSummary;
  onClose: () => void;
  onUpdate: (preset: PresetSummary) => void;
}) {
  const [name, setName] = useState(preset.name);
  const [description, setDescription] = useState(preset.description || '');
  const [category, setCategory] = useState(preset.category);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/presets/${preset.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description: description || undefined,
          category,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update preset');
      }

      const updatedPreset = await response.json();
      onUpdate({
        ...preset,
        name: updatedPreset.name,
        description: updatedPreset.description,
        category: updatedPreset.category,
      });
      toast.success('Preset updated');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update preset');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass =
    'w-full rounded-lg border border-gray-800 bg-gray-950 px-4 py-2.5 text-white placeholder-gray-500 transition-colors outline-none focus:border-accent-primary';

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Dialog */}
      <div className="fixed top-1/2 left-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 px-4">
        <div className="overflow-hidden rounded-2xl border border-gray-800 bg-gray-900 shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-800 p-6">
            <h2 className="text-xl font-semibold text-white">Edit Preset</h2>
            <button
              onClick={onClose}
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
                onClick={onClose}
                className="flex-1 rounded-lg border border-gray-800 bg-gray-950 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !name.trim()}
                className="bg-accent-primary hover:bg-accent-primary/90 flex-1 rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
