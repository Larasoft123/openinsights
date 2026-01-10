import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

/**
 * Video Player Store
 *
 * Central state management for the Analysis Canvas.
 * Syncs video playback with transcript display.
 *
 * Key features:
 * - currentTime sync between video and transcript
 * - Auto-scroll with user-interruption detection
 * - Playback rate control (0.5x to 2.5x)
 * - Frame-by-frame navigation (±33ms)
 * - Search filtering
 */

// Playback rate options
export const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5] as const;
export type PlaybackRate = (typeof PLAYBACK_RATES)[number];

// Frame step duration (1/30th second for 30fps video)
const FRAME_STEP_MS = 33;

interface VideoPlayerState {
  // Playback state
  currentTime: number; // Seconds (float, matches DB startTime/endTime)
  duration: number; // Total duration in seconds
  isPlaying: boolean;
  playbackRate: PlaybackRate;

  // Video element reference (for external seeking)
  videoElement: HTMLVideoElement | null;

  // Transcript state
  activeSegmentId: string | null;
  searchQuery: string;
  filteredSegmentIds: string[] | null; // null means no filter (show all)

  // Auto-scroll state with user-interruption detection
  isAutoScrollEnabled: boolean;
  userScrolledAway: boolean; // True when user manually scrolled away from active segment

  // Actions - Playback
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  setPlaybackRate: (rate: PlaybackRate) => void;
  setVideoElement: (element: HTMLVideoElement | null) => void;

  // Actions - Seeking
  seekTo: (time: number) => void;
  stepForward: () => void; // +33ms (1 frame at 30fps)
  stepBackward: () => void; // -33ms
  seekForward: (seconds: number) => void;
  seekBackward: (seconds: number) => void;

  // Actions - Transcript
  setActiveSegmentId: (id: string | null) => void;
  setSearchQuery: (query: string) => void;
  setFilteredSegmentIds: (ids: string[] | null) => void;

  // Actions - Auto-scroll
  toggleAutoScroll: () => void;
  enableAutoScroll: () => void;
  disableAutoScroll: () => void;
  setUserScrolledAway: (scrolledAway: boolean) => void;
  resumeAutoScroll: () => void; // User clicked "Resume Auto-scroll" button
}

export const useVideoPlayerStore = create<VideoPlayerState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    currentTime: 0,
    duration: 0,
    isPlaying: false,
    playbackRate: 1,
    videoElement: null,
    activeSegmentId: null,
    searchQuery: '',
    filteredSegmentIds: null,
    isAutoScrollEnabled: true,
    userScrolledAway: false,

    // Playback actions
    setCurrentTime: (time) => set({ currentTime: time }),
    setDuration: (duration) => set({ duration }),
    setIsPlaying: (isPlaying) => set({ isPlaying }),
    setPlaybackRate: (rate) => {
      const video = get().videoElement;
      if (video) {
        video.playbackRate = rate;
      }
      set({ playbackRate: rate });
    },
    setVideoElement: (element) => set({ videoElement: element }),

    // Seeking actions
    seekTo: (time) => {
      const { duration, videoElement } = get();
      // Use Infinity as upper bound if duration not yet loaded (avoids clamping to 0)
      const maxTime = duration > 0 ? duration : Infinity;
      const clampedTime = Math.max(0, Math.min(time, maxTime));

      if (videoElement) {
        videoElement.currentTime = clampedTime;
      }

      set({ currentTime: clampedTime });
    },

    stepForward: () => {
      const { currentTime, duration, seekTo } = get();
      const newTime = currentTime + FRAME_STEP_MS / 1000;
      seekTo(Math.min(newTime, duration));
    },

    stepBackward: () => {
      const { currentTime, seekTo } = get();
      const newTime = currentTime - FRAME_STEP_MS / 1000;
      seekTo(Math.max(newTime, 0));
    },

    seekForward: (seconds) => {
      const { currentTime, duration, seekTo } = get();
      seekTo(Math.min(currentTime + seconds, duration));
    },

    seekBackward: (seconds) => {
      const { currentTime, seekTo } = get();
      seekTo(Math.max(currentTime - seconds, 0));
    },

    // Transcript actions
    setActiveSegmentId: (id) => set({ activeSegmentId: id }),
    setSearchQuery: (query) => set({ searchQuery: query }),
    setFilteredSegmentIds: (ids) => set({ filteredSegmentIds: ids }),

    // Auto-scroll actions with user-interruption detection
    toggleAutoScroll: () =>
      set((state) => ({
        isAutoScrollEnabled: !state.isAutoScrollEnabled,
        userScrolledAway: false,
      })),

    enableAutoScroll: () => set({ isAutoScrollEnabled: true, userScrolledAway: false }),

    disableAutoScroll: () => set({ isAutoScrollEnabled: false }),

    setUserScrolledAway: (scrolledAway) => set({ userScrolledAway: scrolledAway }),

    resumeAutoScroll: () => set({ userScrolledAway: false, isAutoScrollEnabled: true }),
  }))
);

/**
 * Selector: Get effective auto-scroll state
 * Auto-scroll is active only when enabled AND user hasn't scrolled away
 */
export const selectIsAutoScrollActive = (state: VideoPlayerState) =>
  state.isAutoScrollEnabled && !state.userScrolledAway;

/**
 * Selector: Should show "Resume Auto-scroll" button
 */
export const selectShouldShowResumeButton = (state: VideoPlayerState) =>
  state.isAutoScrollEnabled && state.userScrolledAway;

/**
 * Re-export formatTime from centralized utils
 * @deprecated Import directly from '@/lib/utils/time' instead
 */
export { formatTime } from '@/lib/utils/time';

/**
 * Helper: Find next/previous playback rate
 */
export function getNextPlaybackRate(current: PlaybackRate): PlaybackRate {
  const idx = PLAYBACK_RATES.indexOf(current);
  return PLAYBACK_RATES[Math.min(idx + 1, PLAYBACK_RATES.length - 1)];
}

export function getPreviousPlaybackRate(current: PlaybackRate): PlaybackRate {
  const idx = PLAYBACK_RATES.indexOf(current);
  return PLAYBACK_RATES[Math.max(idx - 1, 0)];
}
