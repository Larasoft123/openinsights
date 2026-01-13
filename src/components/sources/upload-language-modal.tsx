/**
 * Upload Language Modal Component
 *
 * Modal shown when user selects a file for upload.
 * Allows user to choose language configuration for transcription:
 * - Use project default (preselected)
 * - Auto-detect language
 * - Choose specific language
 */

'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Globe, Wand2, ChevronDown } from 'lucide-react';
import { SUPPORTED_LANGUAGES, LANGUAGE_AUTO, type LanguageCode } from '@/lib/constants/languages';

type LanguageOption = 'project_default' | 'auto_detect' | 'specific';

interface UploadLanguageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (language: string) => void;
  fileName: string;
  projectLanguage: string;
  projectLanguageName: string;
}

export function UploadLanguageModal({
  isOpen,
  onClose,
  onConfirm,
  fileName,
  projectLanguage,
  projectLanguageName,
}: UploadLanguageModalProps) {
  const [selectedOption, setSelectedOption] = useState<LanguageOption>('project_default');
  const [specificLanguage, setSpecificLanguage] = useState<LanguageCode>('en');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleConfirm = () => {
    let language: string;

    switch (selectedOption) {
      case 'project_default':
        language = projectLanguage;
        break;
      case 'auto_detect':
        language = LANGUAGE_AUTO;
        break;
      case 'specific':
        language = specificLanguage;
        break;
    }

    onConfirm(language);
  };

  if (!isOpen) return null;

  // Use portal to render at document body level
  if (typeof document === 'undefined') return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[1100] bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Dialog */}
      <div className="fixed top-1/2 left-1/2 z-[1100] w-full max-w-md -translate-x-1/2 -translate-y-1/2 px-4">
        <div className="overflow-hidden rounded-2xl border border-gray-800 bg-gray-900 shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-800 p-6">
            <h2 className="text-lg font-semibold text-white">Select Language</h2>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* File name */}
            <p className="mb-6 truncate text-sm text-gray-400">
              Uploading: <span className="text-white">{fileName}</span>
            </p>

            {/* Language Options */}
            <div className="space-y-3">
              {/* Project Default */}
              <label
                className={`flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition-colors ${
                  selectedOption === 'project_default'
                    ? 'border-accent-primary bg-accent-primary/10'
                    : 'border-gray-800 hover:border-gray-700'
                }`}
              >
                <input
                  type="radio"
                  name="language-option"
                  value="project_default"
                  checked={selectedOption === 'project_default'}
                  onChange={() => setSelectedOption('project_default')}
                  className="sr-only"
                />
                <div
                  className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                    selectedOption === 'project_default'
                      ? 'border-accent-primary'
                      : 'border-gray-600'
                  }`}
                >
                  {selectedOption === 'project_default' && (
                    <div className="bg-accent-primary h-2.5 w-2.5 rounded-full" />
                  )}
                </div>
                <Globe size={20} className="text-gray-400" />
                <div className="flex-1">
                  <p className="font-medium text-white">
                    Use project default ({projectLanguageName})
                  </p>
                  <p className="text-sm text-gray-500">
                    Transcribe using the project&apos;s language setting
                  </p>
                </div>
              </label>

              {/* Auto-detect */}
              <label
                className={`flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition-colors ${
                  selectedOption === 'auto_detect'
                    ? 'border-accent-primary bg-accent-primary/10'
                    : 'border-gray-800 hover:border-gray-700'
                }`}
              >
                <input
                  type="radio"
                  name="language-option"
                  value="auto_detect"
                  checked={selectedOption === 'auto_detect'}
                  onChange={() => setSelectedOption('auto_detect')}
                  className="sr-only"
                />
                <div
                  className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                    selectedOption === 'auto_detect' ? 'border-accent-primary' : 'border-gray-600'
                  }`}
                >
                  {selectedOption === 'auto_detect' && (
                    <div className="bg-accent-primary h-2.5 w-2.5 rounded-full" />
                  )}
                </div>
                <Wand2 size={20} className="text-gray-400" />
                <div className="flex-1">
                  <p className="font-medium text-white">Auto-detect language</p>
                  <p className="text-sm text-gray-500">
                    AI will analyze and detect the spoken language
                  </p>
                </div>
              </label>

              {/* Specific Language */}
              <label
                className={`flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition-colors ${
                  selectedOption === 'specific'
                    ? 'border-accent-primary bg-accent-primary/10'
                    : 'border-gray-800 hover:border-gray-700'
                }`}
              >
                <input
                  type="radio"
                  name="language-option"
                  value="specific"
                  checked={selectedOption === 'specific'}
                  onChange={() => setSelectedOption('specific')}
                  className="sr-only"
                />
                <div
                  className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                    selectedOption === 'specific' ? 'border-accent-primary' : 'border-gray-600'
                  }`}
                >
                  {selectedOption === 'specific' && (
                    <div className="bg-accent-primary h-2.5 w-2.5 rounded-full" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-white">Choose language</p>
                  <p className="text-sm text-gray-500">
                    Select a specific language for transcription
                  </p>
                </div>
              </label>

              {/* Language Dropdown (visible when specific is selected) */}
              {selectedOption === 'specific' && (
                <div className="relative ml-8">
                  <button
                    type="button"
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex w-full items-center justify-between rounded-lg border border-gray-800 bg-gray-950 px-4 py-2.5 text-white transition-colors hover:border-gray-700"
                  >
                    <span>
                      {SUPPORTED_LANGUAGES.find((l) => l.code === specificLanguage)?.name ||
                        'Select language'}
                    </span>
                    <ChevronDown
                      size={16}
                      className={`text-gray-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {dropdownOpen && (
                    <div className="absolute right-0 left-0 z-10 mt-1 max-h-60 overflow-auto rounded-lg border border-gray-800 bg-gray-950 py-1 shadow-lg">
                      {SUPPORTED_LANGUAGES.map((lang) => (
                        <button
                          key={lang.code}
                          type="button"
                          onClick={() => {
                            setSpecificLanguage(lang.code);
                            setDropdownOpen(false);
                          }}
                          className={`flex w-full items-center gap-2 px-4 py-2 text-left text-sm transition-colors ${
                            specificLanguage === lang.code
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
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 border-t border-gray-800 p-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-800 bg-gray-950 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="bg-accent-primary hover:bg-accent-primary/90 flex-1 rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-colors"
            >
              Upload
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
