'use client';

import { useEffect, useCallback, useRef, type RefObject } from 'react';
import { useVideoPlayerStore } from '@/lib/stores/video-player-store';

interface UseVideoSyncOptions {
  initialTime?: number;
}

/**
 * useVideoSync Hook
 *
 * Bridges the imperative HTML5 Video API with the declarative Zustand store.
 * Handles bidirectional synchronization:
 * 1. Video → Store: timeupdate, play, pause, durationchange events
 * 2. Store → Video: External seek commands
 *
 * @param videoRef - React ref to the HTML5 video element
 * @param options.initialTime - Optional initial time to seek to when video loads (from URL ?t= param)
 */
export function useVideoSync(
  videoRef: RefObject<HTMLVideoElement | null>,
  options: UseVideoSyncOptions = {}
) {
  const { initialTime } = options;
  const { setCurrentTime, setDuration, setIsPlaying, setVideoElement, playbackRate } =
    useVideoPlayerStore();

  // Track whether we've already performed the initial seek
  const hasInitialSeekedRef = useRef(false);

  // Store video element reference
  useEffect(() => {
    const video = videoRef.current;
    setVideoElement(video);

    return () => {
      setVideoElement(null);
    };
  }, [videoRef, setVideoElement]);

  // Sync video events to store
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Throttle timeupdate to ~10 updates/second for performance
    let lastUpdate = 0;
    const THROTTLE_MS = 100;

    const handleTimeUpdate = () => {
      const now = Date.now();
      if (now - lastUpdate >= THROTTLE_MS) {
        setCurrentTime(video.currentTime);
        lastUpdate = now;
      }
    };

    const handleDurationChange = () => {
      if (isFinite(video.duration)) {
        setDuration(video.duration);
      }
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => setIsPlaying(false);

    // Also update duration on loadedmetadata and handle initial seek
    const handleLoadedMetadata = () => {
      if (isFinite(video.duration)) {
        setDuration(video.duration);
      }

      // Seek to initialTime from URL ?t= parameter (only once)
      if (
        initialTime !== undefined &&
        !hasInitialSeekedRef.current &&
        isFinite(video.duration) &&
        initialTime <= video.duration
      ) {
        video.currentTime = initialTime;
        setCurrentTime(initialTime);
        hasInitialSeekedRef.current = true;
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('durationchange', handleDurationChange);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);

    // Set initial duration if already loaded
    if (isFinite(video.duration)) {
      setDuration(video.duration);

      // Handle initial seek if metadata is already loaded
      if (
        initialTime !== undefined &&
        !hasInitialSeekedRef.current &&
        initialTime <= video.duration
      ) {
        video.currentTime = initialTime;
        setCurrentTime(initialTime);
        hasInitialSeekedRef.current = true;
      }
    }

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('durationchange', handleDurationChange);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
    };
  }, [videoRef, setCurrentTime, setDuration, setIsPlaying, initialTime]);

  // Apply playback rate when it changes
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.playbackRate = playbackRate;
    }
  }, [videoRef, playbackRate]);

  // Play/pause control
  const togglePlayPause = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play().catch(() => {
        // Ignore autoplay errors
      });
    } else {
      video.pause();
    }
  }, [videoRef]);

  return { togglePlayPause };
}
