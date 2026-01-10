'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useSpeakerNames } from '@/hooks/use-speaker-names';

interface SpeakerNamesContextValue {
  getDisplayName: (speakerId: string) => string;
  renameSpeaker: (speakerId: string, customName: string) => void;
  hasCustomName: (speakerId: string) => boolean;
}

const SpeakerNamesContext = createContext<SpeakerNamesContextValue | null>(null);

interface SpeakerNamesProviderProps {
  sourceId: string;
  children: ReactNode;
}

export function SpeakerNamesProvider({ sourceId, children }: SpeakerNamesProviderProps) {
  const speakerNames = useSpeakerNames(sourceId);

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
    };
  }
  return context;
}
