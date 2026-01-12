'use client';

import { useState, useCallback, useEffect } from 'react';
import { formatSpeakerId } from '@/lib/utils/speaker-colors';

interface SpeakerNamesMap {
  [speakerId: string]: string;
}

interface UseSpeakerNamesOptions {
  shareToken?: string | null;
}

/**
 * Hook to manage custom speaker names for a project
 *
 * Speakers are stored in the database at the project level.
 * Supports both authenticated and shared (public) access modes.
 *
 * Returns:
 * - getDisplayName: Get display name for a speaker (custom or formatted)
 * - renameSpeaker: Set a custom name for a speaker (only works in authenticated mode)
 * - hasCustomName: Check if a speaker has a custom name
 * - getCustomSpeakerIds: Get all speaker IDs that have custom names
 * - isLoading: Whether speaker names are being fetched
 */
export function useSpeakerNames(projectId: string | null, options?: UseSpeakerNamesOptions) {
  const [speakerNames, setSpeakerNames] = useState<SpeakerNamesMap>({});
  const [isLoading, setIsLoading] = useState(false);
  const shareToken = options?.shareToken;

  // Fetch speaker names from API
  useEffect(() => {
    if (!projectId) {
      setSpeakerNames({});
      return;
    }

    const fetchSpeakerNames = async () => {
      setIsLoading(true);
      try {
        // Use public or authenticated endpoint based on share token
        const endpoint = shareToken
          ? `/api/public/projects/${projectId}/speakers?token=${shareToken}`
          : `/api/projects/${projectId}/speakers`;

        const res = await fetch(endpoint);
        if (res.ok) {
          const data = await res.json();
          setSpeakerNames(data.speakerNames || {});
        }
      } catch (error) {
        console.error('Failed to fetch speaker names:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSpeakerNames();
  }, [projectId, shareToken]);

  const getDisplayName = useCallback(
    (speakerId: string): string => {
      return speakerNames[speakerId] || formatSpeakerId(speakerId);
    },
    [speakerNames]
  );

  const renameSpeaker = useCallback(
    async (speakerId: string, customName: string): Promise<void> => {
      if (!projectId || shareToken) return; // Can't rename in shared mode

      // Optimistic update
      setSpeakerNames((prev) => {
        if (customName.trim()) {
          return { ...prev, [speakerId]: customName.trim() };
        } else {
          const next = { ...prev };
          delete next[speakerId];
          return next;
        }
      });

      // Save to API
      try {
        await fetch(`/api/projects/${projectId}/speakers`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ speakerId, customName }),
        });
      } catch (error) {
        console.error('Failed to save speaker name:', error);
        // Could revert optimistic update here if needed
      }
    },
    [projectId, shareToken]
  );

  const hasCustomName = useCallback(
    (speakerId: string): boolean => {
      return speakerId in speakerNames;
    },
    [speakerNames]
  );

  const getCustomSpeakerIds = useCallback((): string[] => {
    return Object.keys(speakerNames);
  }, [speakerNames]);

  return {
    getDisplayName,
    renameSpeaker,
    hasCustomName,
    getCustomSpeakerIds,
    isLoading,
  };
}
