'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useSpeakerNames } from '@/hooks/use-speaker-names';

interface SpeakerNamesContextValue {
  getDisplayName: (speakerId: string) => string;
  renameSpeaker: (speakerId: string, customName: string) => void;
  hasCustomName: (speakerId: string) => boolean;
  getCustomSpeakerIds: () => string[];
}

const SpeakerNamesContext = createContext<SpeakerNamesContextValue | null>(null);

interface SpeakerNamesProviderProps {
  projectId: string;
  children: ReactNode;
}

/**
 * Provider for speaker names context.
 * Uses projectId so speakers can be shared across all sources in a project.
 */
export function SpeakerNamesProvider({ projectId, children }: SpeakerNamesProviderProps) {
  const speakerNames = useSpeakerNames(projectId);

  return (
    <SpeakerNamesContext.Provider value={speakerNames}>{children}</SpeakerNamesContext.Provider>
  );
}

export function useSpeakerNamesContext() {
  const context = useContext(SpeakerNamesContext);
  // If no provider, return default behavior
  if (!context) {
    return {
      getDisplayName: (speakerId: string) => speakerId,
      renameSpeaker: () => {},
      hasCustomName: () => false,
      getCustomSpeakerIds: () => [],
    };
  }
  return context;
}
