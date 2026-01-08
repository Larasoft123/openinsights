'use client';

import { useEffect, useCallback } from 'react';
import {
  useVideoPlayerStore,
  getNextPlaybackRate,
  getPreviousPlaybackRate,
} from '@/lib/stores/video-player-store';

/**
 * useKeyboardShortcuts Hook
 *
 * Global keyboard event handling for the Analysis Canvas.
 * Provides frame-accurate navigation and playback controls.
 *
 * Keyboard bindings:
 * - Space: Play/Pause toggle
 * - ← / →: Seek ±5 seconds
 * - , / .: Frame step (±33ms at 30fps)
 * - [ / ]: Playback rate ±0.25x
 * - j / l: Seek ±10 seconds
 * - k: Play/Pause (alternative)
 * - Home: Seek to start
 * - End: Seek to end
 */
export function useKeyboardShortcuts() {
  const {
    videoElement,
    playbackRate,
    setPlaybackRate,
    stepForward,
    stepBackward,
    seekForward,
    seekBackward,
    seekTo,
    duration,
  } = useVideoPlayerStore();

  const togglePlayPause = useCallback(() => {
    if (!videoElement) return;

    if (videoElement.paused) {
      videoElement.play().catch(() => {
        // Ignore autoplay errors
      });
    } else {
      videoElement.pause();
    }
  }, [videoElement]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlayPause();
          break;

        case 'ArrowLeft':
          e.preventDefault();
          seekBackward(5);
          break;

        case 'ArrowRight':
          e.preventDefault();
          seekForward(5);
          break;

        case ',':
          e.preventDefault();
          stepBackward();
          break;

        case '.':
          e.preventDefault();
          stepForward();
          break;

        case '[':
          e.preventDefault();
          setPlaybackRate(getPreviousPlaybackRate(playbackRate));
          break;

        case ']':
          e.preventDefault();
          setPlaybackRate(getNextPlaybackRate(playbackRate));
          break;

        case 'j':
          e.preventDefault();
          seekBackward(10);
          break;

        case 'l':
          e.preventDefault();
          seekForward(10);
          break;

        case 'Home':
          e.preventDefault();
          seekTo(0);
          break;

        case 'End':
          e.preventDefault();
          seekTo(duration);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    togglePlayPause,
    stepForward,
    stepBackward,
    seekForward,
    seekBackward,
    setPlaybackRate,
    seekTo,
    playbackRate,
    duration,
  ]);
}
