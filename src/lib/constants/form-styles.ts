/**
 * Shared Form Styling Constants
 *
 * Centralized form element styling for consistent UI across the application.
 * Used by form components, dialogs, and settings pages.
 */

/**
 * Standard input field styling
 * - Full width with rounded corners
 * - Dark background with border
 * - Accent color on focus
 */
export const FORM_INPUT_CLASS =
  'w-full rounded-lg border border-gray-800 bg-gray-950 px-4 py-2.5 text-white placeholder-gray-500 transition-colors outline-none focus:border-accent-primary';

/**
 * Compact input field styling for inline/dense layouts
 * - Smaller padding and font size
 * - Used in tag editing, table rows, etc.
 */
export const FORM_INPUT_COMPACT_CLASS =
  'w-full rounded-lg border border-gray-800 bg-gray-950 px-3 py-1.5 text-sm text-white placeholder-gray-500 transition-colors outline-none focus:border-accent-primary';

/**
 * Standard form label styling
 * - Block display with bottom margin
 * - Medium weight white text
 */
export const FORM_LABEL_CLASS = 'mb-2 block text-sm font-medium text-white';
