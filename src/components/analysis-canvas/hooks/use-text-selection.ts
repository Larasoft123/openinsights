'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

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
 * - Only triggers on mouseup to allow full text selection
 *
 * @param containerRef - Reference to the container element to monitor for selections
 */
export function useTextSelection(containerRef: React.RefObject<HTMLElement | null>) {
  const [selection, setSelection] = useState<TextSelectionInfo | null>(null);
  const isSelectingRef = useRef(false);

  // Process and validate selection
  const processSelection = useCallback((): TextSelectionInfo | null => {
    const windowSelection = window.getSelection();

    // No selection or empty selection
    if (!windowSelection || windowSelection.isCollapsed || !windowSelection.rangeCount) {
      return null;
    }

    const selectedText = windowSelection.toString().trim();
    if (!selectedText || selectedText.length < 2) {
      // Require at least 2 characters to avoid accidental triggers
      return null;
    }

    // Check if selection is within our container
    const container = containerRef.current;
    if (!container) {
      return null;
    }

    const range = windowSelection.getRangeAt(0);
    const commonAncestor = range.commonAncestorContainer;

    // Selection must be within container
    if (!container.contains(commonAncestor)) {
      return null;
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
      return null;
    }

    const segmentId = startSegment.getAttribute('data-segment-id');
    if (!segmentId) {
      return null;
    }

    // Get bounding rect for popover positioning
    const rect = range.getBoundingClientRect();

    return {
      text: selectedText,
      segmentId,
      rect,
    };
  }, [containerRef]);

  // Clear selection (only clear our state, not the browser selection)
  const clearSelection = useCallback(() => {
    setSelection(null);
  }, []);

  // Handle mousedown - track that selection is starting
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as Element;
      const container = containerRef.current;

      // Don't interfere with popover clicks
      if (target.closest('[data-quick-tag-popover]')) {
        return;
      }

      // Track if mouse down is in our container (potential selection start)
      if (container?.contains(target)) {
        isSelectingRef.current = true;
        // Clear previous selection when starting a new one
        setSelection(null);
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [containerRef]);

  // Handle mouseup - finalize selection
  useEffect(() => {
    const handleMouseUp = (e: MouseEvent) => {
      const target = e.target as Element;

      // Don't process if clicking on popover
      if (target.closest('[data-quick-tag-popover]')) {
        return;
      }

      // Only process if we were selecting in our container
      if (!isSelectingRef.current) {
        return;
      }

      isSelectingRef.current = false;

      // Small delay to ensure selection is finalized
      requestAnimationFrame(() => {
        const newSelection = processSelection();
        setSelection(newSelection);
      });
    };

    document.addEventListener('mouseup', handleMouseUp);
    return () => document.removeEventListener('mouseup', handleMouseUp);
  }, [processSelection]);

  // Handle clicks outside to clear selection
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Element;

      // Don't clear if clicking on popover
      if (target.closest('[data-quick-tag-popover]')) {
        return;
      }

      // Clear selection if clicking outside the container
      const container = containerRef.current;
      if (container && !container.contains(target)) {
        setSelection(null);
      }
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [containerRef]);

  return {
    selection,
    clearSelection,
  };
}
