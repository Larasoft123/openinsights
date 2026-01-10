/**
 * Speaker Names Utility
 *
 * Manages custom speaker name overrides stored in localStorage.
 * Allows users to rename speakers from generic IDs to meaningful names.
 *
 * Storage key format: `speaker-names:${sourceId}`
 * Storage value: JSON object mapping speakerId → custom name
 */

const STORAGE_PREFIX = 'speaker-names:';

export interface SpeakerNameMap {
  [speakerId: string]: string;
}

/**
 * Get custom speaker names for a source
 */
export function getSpeakerNames(sourceId: string): SpeakerNameMap {
  if (typeof window === 'undefined') return {};

  try {
    const stored = localStorage.getItem(`${STORAGE_PREFIX}${sourceId}`);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

/**
 * Set a custom name for a speaker
 */
export function setSpeakerName(sourceId: string, speakerId: string, customName: string): void {
  if (typeof window === 'undefined') return;

  const names = getSpeakerNames(sourceId);
  if (customName.trim()) {
    names[speakerId] = customName.trim();
  } else {
    delete names[speakerId];
  }

  try {
    localStorage.setItem(`${STORAGE_PREFIX}${sourceId}`, JSON.stringify(names));
  } catch {
    // localStorage might be full or disabled
  }
}

/**
 * Get display name for a speaker (custom name or formatted ID)
 */
export function getSpeakerDisplayName(
  sourceId: string,
  speakerId: string,
  formatFallback: (id: string) => string
): string {
  const names = getSpeakerNames(sourceId);
  return names[speakerId] || formatFallback(speakerId);
}

/**
 * Get all speaker IDs that have custom names (may not be assigned to any segment yet)
 */
export function getCustomSpeakerIds(sourceId: string): string[] {
  const names = getSpeakerNames(sourceId);
  return Object.keys(names);
}

/**
 * Clear all custom names for a source
 */
export function clearSpeakerNames(sourceId: string): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(`${STORAGE_PREFIX}${sourceId}`);
  } catch {
    // Ignore
  }
}
