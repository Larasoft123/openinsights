/**
 * Edit Project Dialog Component
 *
 * Modal dialog for editing project name and description.
 */

'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { X, ChevronDown } from 'lucide-react';
import {
  SUPPORTED_LANGUAGES,
  DEFAULT_LANGUAGE,
  type LanguageCode,
} from '@/lib/constants/languages';

interface EditProjectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  project: {
    id: string;
    name: string;
    description: string | null;
    language: string;
  };
  /** Callback fired after successful update - use to refresh data */
  onSuccess?: () => void;
}

export function EditProjectDialog({ isOpen, onClose, project, onSuccess }: EditProjectDialogProps) {
  const router = useRouter();
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description || '');
  const [language, setLanguage] = useState<LanguageCode>(
    (project.language as LanguageCode) || DEFAULT_LANGUAGE
  );
  const [languageDropdownOpen, setLanguageDropdownOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when dialog opens with new project
  useEffect(() => {
    if (isOpen) {
      setName(project.name);
      setDescription(project.description || '');
      setLanguage((project.language as LanguageCode) || DEFAULT_LANGUAGE);
      setLanguageDropdownOpen(false);
      setError(null);
    }
  }, [isOpen, project]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description: description || null, language }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update project');
      }

      onClose();
      onSuccess?.();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update project');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  // Use portal to render at document body level to avoid overflow issues
  if (typeof document === 'undefined') return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Dialog */}
      <div className="fixed top-1/2 left-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 px-4">
        <div className="overflow-hidden rounded-2xl border border-gray-800 bg-gray-900 shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-800 p-6">
            <h2 className="text-xl font-semibold text-white">Edit Project</h2>
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
                <label htmlFor="edit-name" className="mb-2 block text-sm font-medium text-white">
                  Project Name
                </label>
                <input
                  id="edit-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., User Research Q1 2024"
                  required
                  className="focus:border-accent-primary w-full rounded-lg border border-gray-800 bg-gray-950 px-4 py-2.5 text-white placeholder-gray-500 transition-colors outline-none"
                  autoFocus
                />
              </div>

              {/* Description Input */}
              <div>
                <label
                  htmlFor="edit-description"
                  className="mb-2 block text-sm font-medium text-white"
                >
                  Description (optional)
                </label>
                <textarea
                  id="edit-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of your research project..."
                  rows={3}
                  className="focus:border-accent-primary w-full rounded-lg border border-gray-800 bg-gray-950 px-4 py-2.5 text-white placeholder-gray-500 transition-colors outline-none"
                />
              </div>

              {/* Language Dropdown */}
              <div>
                <label
                  htmlFor="edit-language"
                  className="mb-2 block text-sm font-medium text-white"
                >
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
    </>,
    document.body
  );
}
