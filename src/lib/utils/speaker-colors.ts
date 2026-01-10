/**
 * Speaker Colors Utility
 *
 * Generates consistent, visually distinct colors for speaker identification.
 * Colors are deterministic based on speaker ID for consistency across sessions.
 */

// Visually distinct colors optimized for speaker identification
// Using colors that work well in both light and dark modes
const SPEAKER_COLORS = [
  { bg: '#3B82F6', text: '#FFFFFF' }, // Blue
  { bg: '#10B981', text: '#FFFFFF' }, // Emerald
  { bg: '#F59E0B', text: '#000000' }, // Amber
  { bg: '#EF4444', text: '#FFFFFF' }, // Red
  { bg: '#8B5CF6', text: '#FFFFFF' }, // Violet
  { bg: '#EC4899', text: '#FFFFFF' }, // Pink
  { bg: '#06B6D4', text: '#000000' }, // Cyan
  { bg: '#84CC16', text: '#000000' }, // Lime
] as const;

/**
 * Simple hash function for strings
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Get a consistent color for a speaker ID
 *
 * @param speakerId - The speaker identifier (e.g., "speaker_1", "SPEAKER_0")
 * @returns Object with background and text colors
 */
export function getSpeakerColor(speakerId: string): { bg: string; text: string } {
  const hash = hashString(speakerId.toLowerCase());
  const index = hash % SPEAKER_COLORS.length;
  return SPEAKER_COLORS[index];
}

/**
 * Get all unique speakers from segments with their colors
 *
 * @param segments - Array of segments with speakerId
 * @returns Array of speaker objects with id and colors
 */
export function getUniqueSpeakers(
  segments: Array<{ speakerId: string | null }>
): Array<{ id: string; bg: string; text: string }> {
  const speakerIds = new Set<string>();

  for (const segment of segments) {
    if (segment.speakerId) {
      speakerIds.add(segment.speakerId);
    }
  }

  return Array.from(speakerIds)
    .sort()
    .map((id) => ({
      id,
      ...getSpeakerColor(id),
    }));
}

/**
 * Format speaker ID for display (e.g., "speaker_1" → "Speaker 1")
 *
 * @param speakerId - Raw speaker ID
 * @returns Formatted display name
 */
export function formatSpeakerId(speakerId: string): string {
  // Handle common formats: speaker_1, SPEAKER_0, Speaker1, etc.
  const match = speakerId.match(/speaker[_\s-]?(\d+)/i);
  if (match) {
    return `Speaker ${parseInt(match[1], 10) + 1}`;
  }
  // Return as-is if it doesn't match expected format
  return speakerId;
}
