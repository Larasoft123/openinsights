'use client';

import { ReactNode } from 'react';
import { ShareProvider } from '@/lib/contexts/read-only-context';
import { PoweredByWatermark } from './powered-by-watermark';

interface SharedProjectWrapperProps {
  children: ReactNode;
  shareToken: string;
  basePath: string;
  includeEvidence: boolean;
  includeInsights: boolean;
}

export function SharedProjectWrapper({
  children,
  shareToken,
  basePath,
  includeEvidence,
  includeInsights,
}: SharedProjectWrapperProps) {
  return (
    <ShareProvider
      accessMode="view"
      shareToken={shareToken}
      basePath={basePath}
      includeEvidence={includeEvidence}
      includeInsights={includeInsights}
    >
      <div className="relative min-h-screen">
        <div className="space-y-8 px-8 py-8">{children}</div>
        <PoweredByWatermark />
      </div>
    </ShareProvider>
  );
}
