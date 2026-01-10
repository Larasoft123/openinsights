import { useState, useCallback } from 'react';

/**
 * Hook for managing async action state (loading, error)
 * Reduces boilerplate in dialog components and forms
 *
 * @example
 * ```tsx
 * const { loading, error, execute } = useAsyncAction();
 *
 * const handleDelete = () => execute(
 *   async () => {
 *     const res = await fetch('/api/...', { method: 'DELETE' });
 *     if (!res.ok) throw new Error((await res.json()).error);
 *   },
 *   () => {
 *     onSuccess();
 *     onClose();
 *   }
 * );
 * ```
 */

export interface UseAsyncActionResult {
  /** Whether the action is currently in progress */
  loading: boolean;
  /** Error message if the action failed, null otherwise */
  error: string | null;
  /** Execute an async action with automatic loading/error state management */
  execute: <T>(fn: () => Promise<T>, onSuccess?: (result: T) => void) => Promise<void>;
  /** Clear the error state */
  clearError: () => void;
}

export function useAsyncAction(): UseAsyncActionResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async <T>(fn: () => Promise<T>, onSuccess?: (result: T) => void) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fn();
      onSuccess?.(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Operation failed');
    } finally {
      setLoading(false);
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return { loading, error, execute, clearError };
}
