'use client';

import { useKeyboardShortcuts } from '../hooks/use-keyboard-shortcuts';

/**
 * KeyboardShortcuts Component
 *
 * Invisible component that enables keyboard shortcuts for the Analysis Canvas.
 * Must be mounted within the canvas to activate shortcuts.
 */
export function KeyboardShortcuts() {
  useKeyboardShortcuts();
  return null;
}
