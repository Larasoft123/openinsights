'use client';

import { useState, useCallback } from 'react';
import {
  getSpeakerNames,
  setSpeakerName as storeSpeakerName,
  getCustomSpeakerIds as getCustomIds,
} from '@/lib/utils/speaker-names';
import { formatSpeakerId } from '@/lib/utils/speaker-colors';

/**
 * Hook to manage custom speaker names for a project
 *
 * Speakers are stored at the project level so they can be reused across sources.
 *
 * Returns:
 * - getDisplayName: Get display name for a speaker (custom or formatted)
 * - renameSpeaker: Set a custom name for a speaker
 * - hasCustomName: Check if a speaker has a custom name
 * - getCustomSpeakerIds: Get all speaker IDs that have custom names
 */
export function useSpeakerNames(projectId: string | null) {
  // Version counter to force re-renders when names change
  const [, setVersion] = useState(0);

  const getDisplayName = useCallback(
    (speakerId: string): string => {
      if (!projectId) return formatSpeakerId(speakerId);
      const names = getSpeakerNames(projectId);
      return names[speakerId] || formatSpeakerId(speakerId);
    },
    [projectId]
  );

  const renameSpeaker = useCallback(
    (speakerId: string, customName: string): void => {
      if (!projectId) return;

      storeSpeakerName(projectId, speakerId, customName);
      // Force re-render to pick up new name from localStorage
      setVersion((v) => v + 1);
    },
    [projectId]
  );

  const hasCustomName = useCallback(
    (speakerId: string): boolean => {
      if (!projectId) return false;
      const names = getSpeakerNames(projectId);
      return speakerId in names;
    },
    [projectId]
  );

  const getCustomSpeakerIds = useCallback((): string[] => {
    if (!projectId) return [];
    return getCustomIds(projectId);
  }, [projectId]);

  return {
    getDisplayName,
    renameSpeaker,
    hasCustomName,
    getCustomSpeakerIds,
  };
}
