import { useRef, useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';

export interface UseDebouncedSaveOptions {
  /** Debounce delay in milliseconds. Default: 1500ms */
  delay?: number;
  /** Whether auto-save is enabled. Default: true */
  enabled?: boolean;
}

export interface UseDebouncedSaveResult {
  /** Force an immediate save, bypassing the debounce timer */
  triggerSave: () => void;
  /** Whether a save is currently in progress */
  isSaving: boolean;
  /** Reset the initial mount flag (call when dialog reopens) */
  resetInitialMount: () => void;
}

/**
 * Hook for debounced auto-save with toast notifications.
 *
 * Handles:
 * - Debounced save on dependency changes
 * - Skips save on initial mount
 * - Loading/success/error toast notifications
 * - Cleanup on unmount (cancels pending saves, dismisses toasts)
 *
 * @example
 * ```tsx
 * const saveData = useCallback(async () => {
 *   const res = await fetch('/api/data', {
 *     method: 'PATCH',
 *     body: JSON.stringify({ name, description }),
 *   });
 *   if (!res.ok) throw new Error('Failed to save');
 * }, [name, description]);
 *
 * useDebouncedSave(saveData, [name, description]);
 * ```
 */
export function useDebouncedSave(
  saveFunction: () => Promise<void>,
  dependencies: unknown[],
  options: UseDebouncedSaveOptions = {}
): UseDebouncedSaveResult {
  const { delay = 1500, enabled = true } = options;

  const [isSaving, setIsSaving] = useState(false);
  const isInitialMount = useRef(true);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const toastIdRef = useRef<string | number | null>(null);

  const executeSave = useCallback(async () => {
    setIsSaving(true);
    toastIdRef.current = toast.loading('Saving...');

    try {
      await saveFunction();
      toast.success('Saved', { id: toastIdRef.current });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save', {
        id: toastIdRef.current,
      });
    } finally {
      setIsSaving(false);
      toastIdRef.current = null;
    }
  }, [saveFunction]);

  // Debounced auto-save effect
  useEffect(() => {
    if (!enabled) return;

    // Skip initial mount to avoid saving on first render
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    // Clear previous timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new timeout for debounced save
    saveTimeoutRef.current = setTimeout(executeSave, delay);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...dependencies, enabled, delay, executeSave]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      if (toastIdRef.current) {
        toast.dismiss(toastIdRef.current);
      }
    };
  }, []);

  const triggerSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    executeSave();
  }, [executeSave]);

  const resetInitialMount = useCallback(() => {
    isInitialMount.current = true;
  }, []);

  return { triggerSave, isSaving, resetInitialMount };
}
