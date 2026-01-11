'use client';

import { createContext, useContext, type ReactNode } from 'react';

export type AccessMode = 'edit' | 'view' | 'comment';

interface ShareContext {
  /**
   * Current access mode:
   * - 'edit': Full access (authenticated users)
   * - 'view': Read-only access (shared links)
   * - 'comment': View + commenting (future)
   */
  accessMode: AccessMode;
  /** Whether the user can perform CRUD operations */
  canEdit: boolean;
  /** Share token if in shared view */
  shareToken?: string;
  /** Base path for navigation (e.g., '/share/abc123' or '/projects/123') */
  basePath: string;
  /** What sections are included in this share */
  includeEvidence?: boolean;
  includeInsights?: boolean;
}

const ShareContextInstance = createContext<ShareContext>({
  accessMode: 'edit',
  canEdit: true,
  basePath: '',
});

interface ShareProviderProps {
  children: ReactNode;
  accessMode: AccessMode;
  shareToken?: string;
  basePath: string;
  includeEvidence?: boolean;
  includeInsights?: boolean;
}

export function ShareProvider({
  children,
  accessMode,
  shareToken,
  basePath,
  includeEvidence = true,
  includeInsights = true,
}: ShareProviderProps) {
  const value: ShareContext = {
    accessMode,
    canEdit: accessMode === 'edit',
    shareToken,
    basePath,
    includeEvidence,
    includeInsights,
  };

  return <ShareContextInstance.Provider value={value}>{children}</ShareContextInstance.Provider>;
}

export function useShareContext() {
  return useContext(ShareContextInstance);
}

/**
 * Hook to check if we're in read-only mode
 */
export function useReadOnly() {
  const { canEdit } = useShareContext();
  return !canEdit;
}
