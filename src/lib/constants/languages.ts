/**
 * Supported languages for transcription.
 * These are ISO 639-1 codes supported by major transcription providers (Deepgram, AssemblyAI, OpenAI Whisper).
 */
export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'ru', name: 'Russian' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'nl', name: 'Dutch' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ar', name: 'Arabic' },
  { code: 'hi', name: 'Hindi' },
  { code: 'uk', name: 'Ukrainian' },
  { code: 'pl', name: 'Polish' },
  { code: 'tr', name: 'Turkish' },
] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]['code'];

/**
 * Special value meaning "auto-detect language before transcription"
 */
export const LANGUAGE_AUTO = 'auto' as const;

/**
 * Default language for new projects
 */
export const DEFAULT_LANGUAGE = 'en' as const;

/**
 * Get language name by code
 */
export function getLanguageName(code: string): string {
  const lang = SUPPORTED_LANGUAGES.find((l) => l.code === code);
  return lang?.name ?? code;
}

/**
 * Check if a language code is valid (either a supported language or 'auto')
 */
export function isValidLanguageCode(code: string): boolean {
  return code === LANGUAGE_AUTO || SUPPORTED_LANGUAGES.some((l) => l.code === code);
}
