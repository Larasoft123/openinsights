/**
 * Color Constants
 * Centralized color palettes for tags, themes, and UI elements
 */

/**
 * Standard color palette for tags and themes
 * Based on Tailwind CSS color scale (500 variants)
 */
export const UI_COLORS = {
  red: '#EF4444',
  orange: '#F97316',
  yellow: '#EAB308',
  green: '#22C55E',
  teal: '#14B8A6',
  cyan: '#06B6D4',
  blue: '#3B82F6',
  indigo: '#6366F1',
  violet: '#8B5CF6',
  purple: '#A855F7',
  pink: '#EC4899',
  gray: '#6B7280',
} as const;

/**
 * Default color palette array (for pickers)
 */
export const DEFAULT_COLORS = Object.values(UI_COLORS);

/**
 * Subset for tags (most commonly used colors)
 */
export const TAG_COLORS = [
  UI_COLORS.red,
  UI_COLORS.orange,
  UI_COLORS.yellow,
  UI_COLORS.green,
  UI_COLORS.cyan,
  UI_COLORS.blue,
  UI_COLORS.violet,
  UI_COLORS.pink,
];

/**
 * Extended palette for themes
 */
export const THEME_COLORS = [
  UI_COLORS.indigo,
  UI_COLORS.violet,
  UI_COLORS.pink,
  UI_COLORS.red,
  UI_COLORS.orange,
  UI_COLORS.yellow,
  UI_COLORS.green,
  UI_COLORS.teal,
  UI_COLORS.blue,
  UI_COLORS.gray,
];

/**
 * Type for color values
 */
export type UIColor = (typeof UI_COLORS)[keyof typeof UI_COLORS];
