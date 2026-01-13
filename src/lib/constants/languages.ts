/**
 * Language definition
 */
export interface LanguageDefinition {
  code: string;
  name: string;
}

/**
 * Transcription provider types
 */
export type TranscriptionProvider = 'deepgram' | 'assemblyai' | 'openai' | 'whisperx';

/**
 * Languages supported by Deepgram Nova models.
 * @see https://developers.deepgram.com/docs/languages
 */
export const DEEPGRAM_LANGUAGES: LanguageDefinition[] = [
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
  { code: 'sv', name: 'Swedish' },
  { code: 'da', name: 'Danish' },
  { code: 'fi', name: 'Finnish' },
  { code: 'no', name: 'Norwegian' },
  { code: 'id', name: 'Indonesian' },
  { code: 'ms', name: 'Malay' },
  { code: 'th', name: 'Thai' },
  { code: 'vi', name: 'Vietnamese' },
  { code: 'cs', name: 'Czech' },
  { code: 'el', name: 'Greek' },
  { code: 'he', name: 'Hebrew' },
  { code: 'ro', name: 'Romanian' },
  { code: 'bg', name: 'Bulgarian' },
  { code: 'hr', name: 'Croatian' },
  { code: 'sk', name: 'Slovak' },
  { code: 'sl', name: 'Slovenian' },
  { code: 'ta', name: 'Tamil' },
  { code: 'te', name: 'Telugu' },
];

/**
 * Languages supported by AssemblyAI.
 * Best model (Universal) supports 99+ languages, but these have highest accuracy.
 * @see https://www.assemblyai.com/docs/concepts/supported-languages
 */
export const ASSEMBLYAI_LANGUAGES: LanguageDefinition[] = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'nl', name: 'Dutch' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ru', name: 'Russian' },
  { code: 'uk', name: 'Ukrainian' },
  { code: 'pl', name: 'Polish' },
  { code: 'tr', name: 'Turkish' },
  { code: 'ar', name: 'Arabic' },
  { code: 'hi', name: 'Hindi' },
  { code: 'vi', name: 'Vietnamese' },
  { code: 'fi', name: 'Finnish' },
];

/**
 * Languages supported by OpenAI Whisper.
 * @see https://platform.openai.com/docs/guides/speech-to-text/supported-languages
 */
export const OPENAI_LANGUAGES: LanguageDefinition[] = [
  { code: 'en', name: 'English' },
  { code: 'zh', name: 'Chinese' },
  { code: 'de', name: 'German' },
  { code: 'es', name: 'Spanish' },
  { code: 'ru', name: 'Russian' },
  { code: 'ko', name: 'Korean' },
  { code: 'fr', name: 'French' },
  { code: 'ja', name: 'Japanese' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'tr', name: 'Turkish' },
  { code: 'pl', name: 'Polish' },
  { code: 'nl', name: 'Dutch' },
  { code: 'ar', name: 'Arabic' },
  { code: 'sv', name: 'Swedish' },
  { code: 'it', name: 'Italian' },
  { code: 'id', name: 'Indonesian' },
  { code: 'hi', name: 'Hindi' },
  { code: 'fi', name: 'Finnish' },
  { code: 'vi', name: 'Vietnamese' },
  { code: 'he', name: 'Hebrew' },
  { code: 'uk', name: 'Ukrainian' },
  { code: 'el', name: 'Greek' },
  { code: 'ms', name: 'Malay' },
  { code: 'cs', name: 'Czech' },
  { code: 'ro', name: 'Romanian' },
  { code: 'da', name: 'Danish' },
  { code: 'hu', name: 'Hungarian' },
  { code: 'ta', name: 'Tamil' },
  { code: 'no', name: 'Norwegian' },
  { code: 'th', name: 'Thai' },
];

/**
 * Languages supported by WhisperX (same as OpenAI Whisper since it's Whisper-based).
 */
export const WHISPERX_LANGUAGES: LanguageDefinition[] = OPENAI_LANGUAGES;

/**
 * Get languages for a specific transcription provider.
 */
export function getLanguagesForProvider(provider: TranscriptionProvider): LanguageDefinition[] {
  switch (provider) {
    case 'deepgram':
      return DEEPGRAM_LANGUAGES;
    case 'assemblyai':
      return ASSEMBLYAI_LANGUAGES;
    case 'openai':
      return OPENAI_LANGUAGES;
    case 'whisperx':
      return WHISPERX_LANGUAGES;
    default:
      // Fallback to common subset
      return DEEPGRAM_LANGUAGES;
  }
}

/**
 * Get human-readable name for a transcription provider.
 */
export function getProviderDisplayName(provider: TranscriptionProvider | null): string {
  switch (provider) {
    case 'deepgram':
      return 'Deepgram';
    case 'assemblyai':
      return 'AssemblyAI';
    case 'openai':
      return 'OpenAI Whisper';
    case 'whisperx':
      return 'WhisperX';
    default:
      return 'transcription';
  }
}

/**
 * Common languages supported by all providers (intersection).
 * Useful as a fallback when provider is unknown.
 */
export const COMMON_LANGUAGES: LanguageDefinition[] = [
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
];

/**
 * @deprecated Use provider-specific lists instead. Kept for backward compatibility.
 */
export const SUPPORTED_LANGUAGES = COMMON_LANGUAGES;

export type LanguageCode = string;

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
