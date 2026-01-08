'use client';

import { useState, useCallback, useEffect } from 'react';

export interface TextSelectionInfo {
  text: string;
  segmentId: string;
  // Position for popover placement
  rect: DOMRect;
}

/**
 * useTextSelection Hook
 *
 * Detects text selection within transcript segments for Quick Tag feature.
 *
 * Key features:
 * - Tracks selected text content
 * - Identifies the segment containing the selection
 * - Provides position info for popover placement
 * - Only captures selection within a single segment (MVP requirement)
 *
 * @param containerRef - Reference to the container element to monitor for selections
 */
export function useTextSelection(containerRef: React.RefObject<HTMLElement | null>) {
  const [selection, setSelection] = useState<TextSelectionInfo | null>(null);

  const handleSelectionChange = useCallback(() => {
    const windowSelection = window.getSelection();

    // No selection or empty selection
    if (!windowSelection || windowSelection.isCollapsed || !windowSelection.rangeCount) {
      setSelection(null);
      return;
    }

    const selectedText = windowSelection.toString().trim();
    if (!selectedText) {
      setSelection(null);
      return;
    }

    // Check if selection is within our container
    const container = containerRef.current;
    if (!container) {
      setSelection(null);
      return;
    }

    const range = windowSelection.getRangeAt(0);
    const commonAncestor = range.commonAncestorContainer;

    // Selection must be within container
    if (!container.contains(commonAncestor)) {
      setSelection(null);
      return;
    }

    // Find the segment element containing the selection
    // Segments have role="button" and a data-segment-id attribute
    const findSegmentElement = (node: Node | null): HTMLElement | null => {
      let current: HTMLElement | null =
        node instanceof HTMLElement ? node : (node?.parentElement ?? null);

      while (current && current !== container) {
        if (current.hasAttribute('data-segment-id')) {
          return current;
        }
        current = current.parentElement;
      }
      return null;
    };

    const startSegment = findSegmentElement(range.startContainer);
    const endSegment = findSegmentElement(range.endContainer);

    // MVP: Only allow selection within a single segment
    if (!startSegment || !endSegment || startSegment !== endSegment) {
      setSelection(null);
      return;
    }

    const segmentId = startSegment.getAttribute('data-segment-id');
    if (!segmentId) {
      setSelection(null);
      return;
    }

    // Get bounding rect for popover positioning
    const rect = range.getBoundingClientRect();

    setSelection({
      text: selectedText,
      segmentId,
      rect,
    });
  }, [containerRef]);

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelection(null);
    window.getSelection()?.removeAllRanges();
  }, []);

  // Listen for selection changes
  useEffect(() => {
    document.addEventListener('selectionchange', handleSelectionChange);

    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [handleSelectionChange]);

  // Clear selection when clicking outside
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as Element;

      // Don't clear if clicking on the popover
      if (target.closest('[data-quick-tag-popover]')) {
        return;
      }

      // Clear selection after a short delay to allow popover interactions
      // This prevents the selection from disappearing before the click is processed
    };

    document.addEventListener('mousedown', handleMouseDown);

    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, []);

  return {
    selection,
    clearSelection,
  };
}
