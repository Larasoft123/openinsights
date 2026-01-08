import { describe, it, expect, beforeEach } from 'vitest';
import {
  useVideoPlayerStore,
  formatTime,
  getNextPlaybackRate,
  getPreviousPlaybackRate,
  PLAYBACK_RATES,
  selectIsAutoScrollActive,
  selectShouldShowResumeButton,
  type PlaybackRate,
} from '@/lib/stores/video-player-store';

/**
 * Video Player Store Tests
 *
 * Tests the "brain" of the Analysis Canvas:
 * - Time synchronization and seeking
 * - Playback rate bounds (0.5x - 2.5x)
 * - Auto-scroll with user-interruption detection
 * - Utility functions
 */

// Helper to get store state and actions
const getStore = () => useVideoPlayerStore.getState();

describe('video-player-store', () => {
  // Reset store state before each test
  beforeEach(() => {
    useVideoPlayerStore.setState({
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
    });
  });

  describe('Time Synchronization', () => {
    it('should update currentTime correctly', () => {
      getStore().setCurrentTime(45.5);
      expect(getStore().currentTime).toBe(45.5);
    });

    it('should update duration correctly', () => {
      getStore().setDuration(3600); // 1 hour video
      expect(getStore().duration).toBe(3600);
    });

    it('should clamp seekTo within bounds [0, duration]', () => {
      getStore().setDuration(100);

      // Seek beyond duration should clamp to duration
      getStore().seekTo(150);
      expect(getStore().currentTime).toBe(100);

      // Seek below 0 should clamp to 0
      getStore().seekTo(-10);
      expect(getStore().currentTime).toBe(0);

      // Normal seek should work
      getStore().seekTo(50);
      expect(getStore().currentTime).toBe(50);
    });

    it('should step forward by 33ms (1 frame at 30fps)', () => {
      getStore().setDuration(100);
      getStore().setCurrentTime(10);

      getStore().stepForward();

      // 33ms = 0.033 seconds
      expect(getStore().currentTime).toBeCloseTo(10.033, 3);
    });

    it('should step backward by 33ms (1 frame at 30fps)', () => {
      getStore().setDuration(100);
      getStore().setCurrentTime(10);

      getStore().stepBackward();

      expect(getStore().currentTime).toBeCloseTo(9.967, 3);
    });

    it('should not step backward below 0', () => {
      getStore().setDuration(100);
      getStore().setCurrentTime(0.01); // Very close to 0

      getStore().stepBackward();

      expect(getStore().currentTime).toBe(0);
    });

    it('should not step forward beyond duration', () => {
      getStore().setDuration(100);
      getStore().setCurrentTime(99.99); // Very close to end

      getStore().stepForward();

      expect(getStore().currentTime).toBe(100);
    });

    it('should seekForward by specified seconds', () => {
      getStore().setDuration(100);
      getStore().setCurrentTime(50);

      getStore().seekForward(5);

      expect(getStore().currentTime).toBe(55);
    });

    it('should seekBackward by specified seconds', () => {
      getStore().setDuration(100);
      getStore().setCurrentTime(50);

      getStore().seekBackward(10);

      expect(getStore().currentTime).toBe(40);
    });

    it('should seekForward and clamp at duration', () => {
      getStore().setDuration(100);
      getStore().setCurrentTime(95);

      getStore().seekForward(10); // Would go to 105, clamps to 100

      expect(getStore().currentTime).toBe(100);
    });

    it('should seekBackward and clamp at 0', () => {
      getStore().setDuration(100);
      getStore().setCurrentTime(5);

      getStore().seekBackward(10); // Would go to -5, clamps to 0

      expect(getStore().currentTime).toBe(0);
    });
  });

  describe('Playback Rate Bounds', () => {
    it('should set playback rate within valid range', () => {
      getStore().setPlaybackRate(1.5);
      expect(getStore().playbackRate).toBe(1.5);
    });

    it('should accept all valid playback rates', () => {
      for (const rate of PLAYBACK_RATES) {
        getStore().setPlaybackRate(rate);
        expect(getStore().playbackRate).toBe(rate);
      }
    });

    it('should have correct playback rate range (0.5x to 2.5x)', () => {
      expect(PLAYBACK_RATES[0]).toBe(0.5);
      expect(PLAYBACK_RATES[PLAYBACK_RATES.length - 1]).toBe(2.5);
    });

    it('should apply playback rate to video element when available', () => {
      const mockVideo = { playbackRate: 1 } as HTMLVideoElement;

      getStore().setVideoElement(mockVideo);
      getStore().setPlaybackRate(2);

      expect(mockVideo.playbackRate).toBe(2);
      expect(getStore().playbackRate).toBe(2);
    });

    it('should not throw when setting rate without video element', () => {
      expect(() => {
        getStore().setPlaybackRate(1.5);
      }).not.toThrow();
      expect(getStore().playbackRate).toBe(1.5);
    });
  });

  describe('Auto-Scroll with User-Interruption Detection', () => {
    it('should have auto-scroll enabled by default', () => {
      expect(getStore().isAutoScrollEnabled).toBe(true);
    });

    it('should have userScrolledAway false by default', () => {
      expect(getStore().userScrolledAway).toBe(false);
    });

    it('should toggle auto-scroll state', () => {
      getStore().toggleAutoScroll();
      expect(getStore().isAutoScrollEnabled).toBe(false);

      getStore().toggleAutoScroll();
      expect(getStore().isAutoScrollEnabled).toBe(true);
    });

    it('should reset userScrolledAway when toggling auto-scroll', () => {
      getStore().setUserScrolledAway(true);
      expect(getStore().userScrolledAway).toBe(true);

      getStore().toggleAutoScroll();
      expect(getStore().userScrolledAway).toBe(false);
    });

    it('should set userScrolledAway when user manually scrolls', () => {
      getStore().setUserScrolledAway(true);
      expect(getStore().userScrolledAway).toBe(true);
    });

    it('should enable auto-scroll and reset scrolled away state', () => {
      getStore().disableAutoScroll();
      getStore().setUserScrolledAway(true);

      getStore().enableAutoScroll();

      expect(getStore().isAutoScrollEnabled).toBe(true);
      expect(getStore().userScrolledAway).toBe(false);
    });

    it('should disable auto-scroll', () => {
      getStore().disableAutoScroll();
      expect(getStore().isAutoScrollEnabled).toBe(false);
    });

    it('should resume auto-scroll correctly', () => {
      // Simulate user scrolled away with auto-scroll disabled
      getStore().setUserScrolledAway(true);
      getStore().disableAutoScroll();

      expect(getStore().isAutoScrollEnabled).toBe(false);
      expect(getStore().userScrolledAway).toBe(true);

      // Resume auto-scroll
      getStore().resumeAutoScroll();

      expect(getStore().isAutoScrollEnabled).toBe(true);
      expect(getStore().userScrolledAway).toBe(false);
    });

    it('selectIsAutoScrollActive should return true only when enabled AND not scrolled away', () => {
      // Default: enabled and not scrolled away
      expect(selectIsAutoScrollActive(getStore())).toBe(true);

      // User scrolls away
      getStore().setUserScrolledAway(true);
      expect(selectIsAutoScrollActive(getStore())).toBe(false);

      // Reset and disable instead
      getStore().setUserScrolledAway(false);
      getStore().disableAutoScroll();
      expect(selectIsAutoScrollActive(getStore())).toBe(false);
    });

    it('selectShouldShowResumeButton should return true when enabled but scrolled away', () => {
      // Default: enabled and not scrolled away - no button
      expect(selectShouldShowResumeButton(getStore())).toBe(false);

      // User scrolls away while auto-scroll is enabled - show button
      getStore().setUserScrolledAway(true);
      expect(selectShouldShowResumeButton(getStore())).toBe(true);

      // If user disables auto-scroll manually - no button (they chose to disable it)
      getStore().disableAutoScroll();
      expect(selectShouldShowResumeButton(getStore())).toBe(false);
    });
  });

  describe('Transcript State', () => {
    it('should update active segment ID', () => {
      getStore().setActiveSegmentId('segment-123');
      expect(getStore().activeSegmentId).toBe('segment-123');
    });

    it('should update search query', () => {
      getStore().setSearchQuery('user feedback');
      expect(getStore().searchQuery).toBe('user feedback');
    });

    it('should update filtered segment IDs', () => {
      const filteredIds = ['seg-1', 'seg-5', 'seg-10'];

      getStore().setFilteredSegmentIds(filteredIds);

      expect(getStore().filteredSegmentIds).toEqual(filteredIds);
    });

    it('should allow clearing filtered segment IDs', () => {
      getStore().setFilteredSegmentIds(['seg-1']);
      expect(getStore().filteredSegmentIds).toEqual(['seg-1']);

      getStore().setFilteredSegmentIds(null);
      expect(getStore().filteredSegmentIds).toBeNull();
    });
  });

  describe('Playing State', () => {
    it('should update isPlaying state', () => {
      expect(getStore().isPlaying).toBe(false);

      getStore().setIsPlaying(true);
      expect(getStore().isPlaying).toBe(true);

      getStore().setIsPlaying(false);
      expect(getStore().isPlaying).toBe(false);
    });
  });

  describe('Video Element Reference', () => {
    it('should store video element reference', () => {
      const mockVideo = document.createElement('video');

      getStore().setVideoElement(mockVideo);
      expect(getStore().videoElement).toBe(mockVideo);
    });

    it('should clear video element reference', () => {
      const mockVideo = document.createElement('video');
      getStore().setVideoElement(mockVideo);

      getStore().setVideoElement(null);
      expect(getStore().videoElement).toBeNull();
    });

    it('should update video currentTime when seekTo is called', () => {
      const mockVideo = { currentTime: 0 } as HTMLVideoElement;
      getStore().setVideoElement(mockVideo);
      getStore().setDuration(100);

      getStore().seekTo(50);

      expect(mockVideo.currentTime).toBe(50);
      expect(getStore().currentTime).toBe(50);
    });
  });
});

describe('Utility Functions', () => {
  describe('formatTime', () => {
    it('should format seconds to MM:SS', () => {
      expect(formatTime(0)).toBe('0:00');
      expect(formatTime(30)).toBe('0:30');
      expect(formatTime(60)).toBe('1:00');
      expect(formatTime(90)).toBe('1:30');
      expect(formatTime(599)).toBe('9:59');
    });

    it('should format to HH:MM:SS for times >= 1 hour', () => {
      expect(formatTime(3600)).toBe('1:00:00');
      expect(formatTime(3661)).toBe('1:01:01');
      expect(formatTime(7200)).toBe('2:00:00');
      expect(formatTime(7325)).toBe('2:02:05');
    });

    it('should handle edge cases', () => {
      expect(formatTime(-10)).toBe('0:00'); // Negative
      expect(formatTime(NaN)).toBe('0:00'); // NaN
      expect(formatTime(Infinity)).toBe('0:00'); // Infinity
    });

    it('should floor fractional seconds', () => {
      expect(formatTime(30.9)).toBe('0:30');
      expect(formatTime(59.99)).toBe('0:59');
    });

    it('should pad minutes and seconds with leading zeros', () => {
      expect(formatTime(5)).toBe('0:05');
      expect(formatTime(65)).toBe('1:05');
      expect(formatTime(3605)).toBe('1:00:05');
    });
  });

  describe('getNextPlaybackRate', () => {
    it('should return next higher playback rate', () => {
      expect(getNextPlaybackRate(1)).toBe(1.25);
      expect(getNextPlaybackRate(1.5)).toBe(1.75);
    });

    it('should stay at max rate when already at maximum', () => {
      expect(getNextPlaybackRate(2.5)).toBe(2.5);
    });

    it('should handle all rates in sequence', () => {
      let rate: PlaybackRate = PLAYBACK_RATES[0];
      for (let i = 1; i < PLAYBACK_RATES.length; i++) {
        rate = getNextPlaybackRate(rate);
        expect(rate).toBe(PLAYBACK_RATES[i]);
      }
    });
  });

  describe('getPreviousPlaybackRate', () => {
    it('should return next lower playback rate', () => {
      expect(getPreviousPlaybackRate(1)).toBe(0.75);
      expect(getPreviousPlaybackRate(1.5)).toBe(1.25);
    });

    it('should stay at min rate when already at minimum', () => {
      expect(getPreviousPlaybackRate(0.5)).toBe(0.5);
    });

    it('should handle all rates in reverse sequence', () => {
      let rate: PlaybackRate = PLAYBACK_RATES[PLAYBACK_RATES.length - 1];
      for (let i = PLAYBACK_RATES.length - 2; i >= 0; i--) {
        rate = getPreviousPlaybackRate(rate);
        expect(rate).toBe(PLAYBACK_RATES[i]);
      }
    });
  });
});
