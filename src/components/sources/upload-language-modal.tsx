/**
 * Upload Language Modal Component
 *
 * Modal shown when user selects a file for upload.
 * Allows user to choose language configuration for transcription:
 * - Use project default (preselected)
 * - Auto-detect language
 * - Choose specific language
 *
 * Uses Shadcn Dialog for consistent UX, accessibility, and ESC key handling.
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Globe, Wand2, ChevronDown, Settings } from 'lucide-react';
import { LANGUAGE_AUTO } from '@/lib/constants/languages';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface LanguageItem {
  code: string;
  name: string;
}

type LanguageOptionType = 'project_default' | 'auto_detect' | 'specific';

interface UploadLanguageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (language: string) => void;
  fileName: string;
  projectLanguage: string;
  projectLanguageName: string;
  /** Languages supported by the transcription provider */
  supportedLanguages: LanguageItem[];
  /** Name of the current transcription provider (for display) */
  transcriptionProviderName?: string;
}

export function UploadLanguageModal({
  isOpen,
  onClose,
  onConfirm,
  fileName,
  projectLanguage,
  projectLanguageName,
  supportedLanguages,
  transcriptionProviderName,
}: UploadLanguageModalProps) {
  const [selectedOption, setSelectedOption] = useState<LanguageOptionType>('project_default');
  const [specificLanguage, setSpecificLanguage] = useState<string>(
    supportedLanguages[0]?.code || 'en'
  );
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

  const handleClose = () => {
    setDropdownOpen(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Select Language</DialogTitle>
        </DialogHeader>

        {/* Content */}
        <div className="space-y-4">
          {/* File name */}
          <p className="truncate text-sm text-gray-400">
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
                  selectedOption === 'project_default' ? 'border-accent-primary' : 'border-gray-600'
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
              <div className="ml-8">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex w-full items-center justify-between rounded-lg border border-gray-800 bg-gray-950 px-4 py-2.5 text-white transition-colors hover:border-gray-700"
                  >
                    <span>
                      {supportedLanguages.find((l) => l.code === specificLanguage)?.name ||
                        'Select language'}
                    </span>
                    <ChevronDown
                      size={16}
                      className={`text-gray-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {dropdownOpen && (
                    <>
                      {/* Click outside to close */}
                      <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
                      <div className="absolute right-0 left-0 z-20 mt-1 max-h-60 overflow-auto rounded-lg border border-gray-800 bg-gray-950 py-1 shadow-lg">
                        {supportedLanguages.map((lang) => (
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
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Provider hint with settings link */}
            <div className="mt-4 flex items-center gap-1.5 text-xs text-gray-500">
              <Settings size={12} />
              <span>
                Languages for{' '}
                <span className="text-gray-400">
                  {transcriptionProviderName || 'transcription'}
                </span>
                .
              </span>
              <Link
                href="/settings/ai"
                className="text-accent-primary hover:underline"
                onClick={handleClose}
              >
                Change provider
              </Link>
            </div>
          </div>
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
            onClick={handleConfirm}
            className="bg-accent-primary hover:bg-accent-primary/90 flex-1 rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-colors"
          >
            Upload
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
