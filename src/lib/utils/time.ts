/**
 * Time Utility Functions
 * Centralized time formatting and parsing utilities
 */

/**
 * Format seconds as MM:SS or HH:MM:SS
 * @param seconds - Time in seconds
 * @returns Formatted time string
 * @example
 * formatTime(90) // "1:30"
 * formatTime(3665) // "1:01:05"
 */
export function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '0:00';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format seconds as MM:SS.ms with milliseconds
 * @param seconds - Time in seconds (can include fractional seconds)
 * @returns Formatted time string with milliseconds
 * @example
 * formatTimeWithMs(90.5) // "1:30.50"
 */
export function formatTimeWithMs(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 100);
  return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
}

/**
 * Format seconds as MM:SS for input fields (no hours)
 * @param seconds - Time in seconds
 * @returns Formatted time string (MM:SS)
 * @example
 * formatTimeForInput(90) // "1:30"
 */
export function formatTimeForInput(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Parse time string to seconds
 * Accepts multiple formats: "MM:SS", "MM:SS.ms", or plain seconds
 * @param timeStr - Time string to parse
 * @returns Seconds as number, or null if invalid
 * @example
 * parseTimeString("1:30") // 90
 * parseTimeString("1:30.5") // 90.5
 * parseTimeString("90") // 90
 * parseTimeString("90.5") // 90.5
 */
export function parseTimeString(timeStr: string): number | null {
  const trimmed = timeStr.trim();
  if (!trimmed) return null;

  // Handle MM:SS or MM:SS.ms format
  const colonMatch = trimmed.match(/^(\d+):(\d{1,2})(?:\.(\d+))?$/);
  if (colonMatch) {
    const mins = parseInt(colonMatch[1], 10);
    const secs = parseInt(colonMatch[2], 10);
    const ms = colonMatch[3] ? parseFloat(`0.${colonMatch[3]}`) : 0;
    if (secs >= 60) return null;
    return mins * 60 + secs + ms;
  }

  // Handle plain seconds
  const num = parseFloat(trimmed);
  return !isNaN(num) && num >= 0 ? num : null;
}
