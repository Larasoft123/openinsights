'use client';

import { ReactNode } from 'react';
import { ShareProvider } from '@/lib/contexts/read-only-context';
import { PoweredByWatermark } from './powered-by-watermark';

interface SharedSourceWrapperProps {
  children: ReactNode;
  shareToken: string;
  basePath: string;
}

/**
 * Wrapper component for shared source views
 * Provides ShareProvider context with view access mode
 */
export function SharedSourceWrapper({ children, shareToken, basePath }: SharedSourceWrapperProps) {
  return (
    <ShareProvider
      accessMode="view"
      shareToken={shareToken}
      basePath={basePath}
      includeEvidence={true}
      includeInsights={false}
    >
      <div className="relative min-h-screen">
        {children}
        <PoweredByWatermark />
      </div>
    </ShareProvider>
  );
}
