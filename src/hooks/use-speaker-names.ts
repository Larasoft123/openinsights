'use client';

import { useState, useCallback } from 'react';
import { getSpeakerNames, setSpeakerName as storeSpeakerName } from '@/lib/utils/speaker-names';
import { formatSpeakerId } from '@/lib/utils/speaker-colors';

/**
 * Hook to manage custom speaker names for a source
 *
 * Returns:
 * - getDisplayName: Get display name for a speaker (custom or formatted)
 * - renameSpeaker: Set a custom name for a speaker
 * - hasCustomName: Check if a speaker has a custom name
 */
export function useSpeakerNames(sourceId: string | null) {
  // Version counter to force re-renders when names change
  const [, setVersion] = useState(0);

  const getDisplayName = useCallback(
    (speakerId: string): string => {
      if (!sourceId) return formatSpeakerId(speakerId);
      const names = getSpeakerNames(sourceId);
      return names[speakerId] || formatSpeakerId(speakerId);
    },
    [sourceId]
  );

  const renameSpeaker = useCallback(
    (speakerId: string, customName: string): void => {
      if (!sourceId) return;

      storeSpeakerName(sourceId, speakerId, customName);
      // Force re-render to pick up new name from localStorage
      setVersion((v) => v + 1);
    },
    [sourceId]
  );

  const hasCustomName = useCallback(
    (speakerId: string): boolean => {
      if (!sourceId) return false;
      const names = getSpeakerNames(sourceId);
      return speakerId in names;
    },
    [sourceId]
  );

  return {
    getDisplayName,
    renameSpeaker,
    hasCustomName,
  };
}
