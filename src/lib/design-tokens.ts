/**
 * OpenInsights Unified Design System Tokens
 *
 * This file contains all design tokens used across the application.
 * Based on analysis of Sprint Linear Clone and Modern Smart Home Dashboard templates.
 *
 * Usage:
 * - Import tokens in components: import { tokens } from '@/lib/design-tokens'
 * - Use in Tailwind config for extended theme values
 * - Reference in CSS variables for dynamic theming
 */

export const tokens = {
  /**
   * Color System
   * Dark-first palette with light theme support
   */
  colors: {
    // Base backgrounds (dark theme primary)
    base: '#09090B',          // Main background (gray-950 equivalent)
    surface: {
      1: '#18181B',           // Cards, panels (gray-900)
      2: '#27272A',           // Nested cards (gray-800)
      3: '#3F3F46',           // Hover states (gray-700)
    },

    // Light theme alternatives
    baseLight: '#FFFFFF',
    surfaceLight: {
      1: '#F9FAFB',           // gray-50
      2: '#F3F4F6',           // gray-100
      3: '#E5E7EB',           // gray-200
    },

    // Borders & Dividers
    border: {
      subtle: '#27272A',      // 1px dividers (gray-800)
      default: '#3F3F46',     // Standard borders (gray-700)
      strong: '#52525B',      // Emphasized borders (gray-600)
    },

    // Text colors
    text: {
      primary: '#FFFFFF',     // Main text
      secondary: '#A1A1AA',   // Muted text (gray-400)
      tertiary: '#71717A',    // Very muted (gray-500)
      inverse: '#09090B',     // Text on light backgrounds
    },

    // Accent colors (primary brand)
    accent: {
      primary: '#6366F1',     // indigo-500
      hover: '#4F46E5',       // indigo-600
      subtle: '#3730A3',      // indigo-800
      light: '#818CF8',       // indigo-400
    },

    // Status colors
    status: {
      success: '#10B981',     // green-500
      warning: '#F59E0B',     // amber-500
      error: '#EF4444',       // red-500
      info: '#3B82F6',        // blue-500
    },

    // Semantic background tints
    tint: {
      success: 'rgba(16, 185, 129, 0.1)',
      warning: 'rgba(245, 158, 11, 0.1)',
      error: 'rgba(239, 68, 68, 0.1)',
      info: 'rgba(59, 130, 246, 0.1)',
      accent: 'rgba(99, 102, 241, 0.1)',
    },
  },

  /**
   * Typography Scale
   * Font sizes, weights, line heights, and letter spacing
   */
  typography: {
    // Font families
    fontFamily: {
      sans: "'Geist', system-ui, -apple-system, sans-serif",
      mono: "'Geist Mono', 'JetBrains Mono', 'Courier New', monospace",
    },

    // Font sizes (using clamp for responsive scaling where applicable)
    fontSize: {
      // Landing page hero sizes
      hero: 'clamp(2.5rem, 5vw, 3.5rem)',      // 40px-56px
      h1: 'clamp(2rem, 4vw, 3rem)',            // 32px-48px
      h2: 'clamp(1.75rem, 3vw, 2.25rem)',      // 28px-36px

      // Dashboard headers
      pageTitle: '1.875rem',    // 30px
      sectionTitle: '1.5rem',   // 24px
      cardTitle: '1.25rem',     // 20px

      // Body text
      lg: '1.125rem',           // 18px - landing paragraphs
      base: '1rem',             // 16px - default
      sm: '0.875rem',           // 14px - metadata
      xs: '0.75rem',            // 12px - labels
      xxs: '0.625rem',          // 10px - micro text
    },

    // Font weights
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },

    // Line heights
    lineHeight: {
      tight: 1.1,               // Headlines
      snug: 1.25,               // Subheadings
      normal: 1.5,              // Body text
      relaxed: 1.625,           // Landing copy
      loose: 1.75,              // Very spacious
    },

    // Letter spacing
    letterSpacing: {
      tighter: '-0.05em',
      tight: '-0.0325em',       // Large headlines (Sprint pattern)
      normal: '0',
      wide: '0.025em',
      wider: '0.05em',          // Uppercase labels
      widest: '0.1em',
    },
  },

  /**
   * Spacing System
   * Based on 4px grid with responsive scaling
   */
  spacing: {
    0: '0',
    0.5: '0.125rem',    // 2px - micro adjustments
    1: '0.25rem',       // 4px - tight
    2: '0.5rem',        // 8px - compact
    3: '0.75rem',       // 12px - default gap
    4: '1rem',          // 16px - standard padding
    5: '1.25rem',       // 20px
    6: '1.5rem',        // 24px - section padding
    8: '2rem',          // 32px - large section padding
    10: '2.5rem',       // 40px
    12: '3rem',         // 48px - hero section spacing
    16: '4rem',         // 64px - between major sections
    20: '5rem',         // 80px
    24: '6rem',         // 96px - landing page section gaps
    32: '8rem',         // 128px
    40: '10rem',        // 160px
  },

  /**
   * Border Radius System
   * Unified scale for different component sizes
   */
  borderRadius: {
    none: '0',
    sm: '0.375rem',     // 6px - tight elements (pills, small buttons)
    md: '0.5rem',       // 8px - standard (inputs, small cards)
    lg: '0.75rem',      // 12px - default cards
    xl: '1rem',         // 16px - large cards (rounded-2xl)
    '2xl': '1.5rem',    // 24px - hero cards (rounded-3xl)
    '3xl': '2rem',      // 32px - special showcase cards
    full: '9999px',     // pills, avatars, fully rounded
  },

  /**
   * Shadows
   * Elevation system for layering
   */
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    base: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
    '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)',
  },

  /**
   * Animation & Transitions
   * Durations and easing curves
   */
  animation: {
    // Durations
    duration: {
      fast: '150ms',
      normal: '200ms',
      slow: '300ms',
      slower: '500ms',
      slowest: '1000ms',
    },

    // Easing curves
    easing: {
      default: 'cubic-bezier(0.4, 0, 0.2, 1)',      // Tailwind default
      smooth: 'cubic-bezier(0.22, 1, 0.36, 1)',     // Sprint smooth
      spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',  // Playful bounce
      linear: 'linear',
      in: 'cubic-bezier(0.4, 0, 1, 1)',
      out: 'cubic-bezier(0, 0, 0.2, 1)',
      inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    },
  },

  /**
   * Breakpoints
   * Responsive design breakpoints (matches Tailwind defaults)
   */
  breakpoints: {
    sm: '640px',      // Mobile landscape
    md: '768px',      // Tablet
    lg: '1024px',     // Desktop
    xl: '1280px',     // Large desktop
    '2xl': '1536px',  // Extra large
  },

  /**
   * Z-Index Scale
   * Stacking context for overlays and layers
   */
  zIndex: {
    base: 0,
    dropdown: 1000,
    sticky: 1100,
    fixed: 1200,
    modalBackdrop: 1300,
    modal: 1400,
    popover: 1500,
    tooltip: 1600,
  },

  /**
   * Opacity Scale
   * For overlays, disabled states, etc.
   */
  opacity: {
    0: '0',
    5: '0.05',
    10: '0.1',
    20: '0.2',
    30: '0.3',
    40: '0.4',
    50: '0.5',
    60: '0.6',
    70: '0.7',
    75: '0.75',
    80: '0.8',
    90: '0.9',
    95: '0.95',
    100: '1',
  },
} as const;

/**
 * Type exports for TypeScript autocomplete
 */
export type DesignTokens = typeof tokens;
export type ColorTokens = typeof tokens.colors;
export type TypographyTokens = typeof tokens.typography;
export type SpacingTokens = typeof tokens.spacing;
export type BorderRadiusTokens = typeof tokens.borderRadius;
