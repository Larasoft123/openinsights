/**
 * Speaker Names Utility
 *
 * Manages custom speaker name overrides stored in localStorage.
 * Allows users to rename speakers from generic IDs to meaningful names.
 * Speakers are stored at the project level so they can be reused across sources.
 *
 * Storage key format: `speaker-names:${projectId}`
 * Storage value: JSON object mapping speakerId → custom name
 */

const STORAGE_PREFIX = 'speaker-names:';

export interface SpeakerNameMap {
  [speakerId: string]: string;
}

/**
 * Get custom speaker names for a project
 */
export function getSpeakerNames(projectId: string): SpeakerNameMap {
  if (typeof window === 'undefined') return {};

  try {
    const stored = localStorage.getItem(`${STORAGE_PREFIX}${projectId}`);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

/**
 * Set a custom name for a speaker
 */
export function setSpeakerName(projectId: string, speakerId: string, customName: string): void {
  if (typeof window === 'undefined') return;

  const names = getSpeakerNames(projectId);
  if (customName.trim()) {
    names[speakerId] = customName.trim();
  } else {
    delete names[speakerId];
  }

  try {
    localStorage.setItem(`${STORAGE_PREFIX}${projectId}`, JSON.stringify(names));
  } catch {
    // localStorage might be full or disabled
  }
}

/**
 * Get display name for a speaker (custom name or formatted ID)
 */
export function getSpeakerDisplayName(
  projectId: string,
  speakerId: string,
  formatFallback: (id: string) => string
): string {
  const names = getSpeakerNames(projectId);
  return names[speakerId] || formatFallback(speakerId);
}

/**
 * Get all speaker IDs that have custom names (may not be assigned to any segment yet)
 */
export function getCustomSpeakerIds(projectId: string): string[] {
  const names = getSpeakerNames(projectId);
  return Object.keys(names);
}

/**
 * Clear all custom names for a project
 */
export function clearSpeakerNames(projectId: string): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(`${STORAGE_PREFIX}${projectId}`);
  } catch {
    // Ignore
  }
}
