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

/**
 * Format seconds with short format option
 * Similar to formatTime but with options for null handling and short format
 * @param seconds - Time in seconds (can be null)
 * @param options - Formatting options
 * @returns Formatted time string
 * @example
 * formatTimeWithOptions(90) // "1:30"
 * formatTimeWithOptions(null, { nullValue: 'N/A' }) // "N/A"
 * formatTimeWithOptions(45, { shortFormat: true }) // "45s"
 * formatTimeWithOptions(90, { shortFormat: true }) // "1:30"
 */
export function formatTimeWithOptions(
  seconds: number | null,
  options?: {
    /** Return this string if seconds is null */
    nullValue?: string;
    /** Show seconds-only format for values under 60s (e.g., "45s") */
    shortFormat?: boolean;
  }
): string {
  const { nullValue = '--:--', shortFormat = false } = options ?? {};

  if (seconds === null) return nullValue;

  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);

  if (shortFormat && mins === 0) {
    return `${secs}s`;
  }

  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format seconds into a human-readable duration (e.g., "2h 15m", "45m", "30s")
 * @param seconds - Number of seconds
 * @returns Human-readable duration string
 * @example
 * formatDuration(7200) // "2h 0m"
 * formatDuration(2700) // "45m"
 * formatDuration(30) // "30s"
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  if (mins > 0) {
    return `${mins}m`;
  }
  return `${secs}s`;
}

/**
 * Format a date string into localized short format
 * @param dateString - ISO date string
 * @returns Formatted date (e.g., "Jan 15, 2024")
 * @example
 * formatDate("2024-01-15T10:30:00Z") // "Jan 15, 2024"
 */
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format a date into a relative string (e.g., "2 hours ago", "yesterday")
 * @param date - Date to format (Date object or ISO string)
 * @returns Relative time string
 * @example
 * formatRelativeTime(new Date(Date.now() - 1000 * 60 * 30)) // "30 minutes ago"
 * formatRelativeTime(new Date(Date.now() - 1000 * 60 * 60 * 2)) // "2 hours ago"
 */
export function formatRelativeTime(date: Date | string): string {
  const now = new Date();
  const then = typeof date === 'string' ? new Date(date) : date;
  const diffMs = now.getTime() - then.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;

  return formatDate(date.toString());
}
