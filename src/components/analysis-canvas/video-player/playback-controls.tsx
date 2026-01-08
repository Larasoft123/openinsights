'use client';

import { useCallback, type RefObject } from 'react';
import { Play, Pause, SkipBack, SkipForward, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useVideoPlayerStore, formatTime, PLAYBACK_RATES } from '@/lib/stores/video-player-store';
import { cn } from '@/lib/utils';

interface PlaybackControlsProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  className?: string;
}

/**
 * PlaybackControls Component
 *
 * Full playback controls including:
 * - Play/Pause button
 * - Frame step buttons (±33ms)
 * - Progress bar with seek
 * - Time display
 * - Playback rate selector
 */
export function PlaybackControls({ videoRef, className }: PlaybackControlsProps) {
  const {
    currentTime,
    duration,
    isPlaying,
    playbackRate,
    setPlaybackRate,
    seekTo,
    stepForward,
    stepBackward,
  } = useVideoPlayerStore();

  const togglePlayPause = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [videoRef]);

  const handleProgressChange = useCallback(
    (value: number[]) => {
      seekTo(value[0]);
    },
    [seekTo]
  );

  const cyclePlaybackRate = useCallback(() => {
    const currentIndex = PLAYBACK_RATES.indexOf(playbackRate);
    const nextIndex = (currentIndex + 1) % PLAYBACK_RATES.length;
    setPlaybackRate(PLAYBACK_RATES[nextIndex]);
  }, [playbackRate, setPlaybackRate]);

  return (
    <TooltipProvider delayDuration={300}>
      <div className={cn('flex flex-col gap-2', className)}>
        {/* Progress Bar */}
        <div className="flex items-center gap-3">
          <span className="text-muted-foreground w-14 text-right font-mono text-xs">
            {formatTime(currentTime)}
          </span>

          <Slider
            value={[currentTime]}
            min={0}
            max={duration || 100}
            step={0.1}
            onValueChange={handleProgressChange}
            className="flex-1"
          />

          <span className="text-muted-foreground w-14 font-mono text-xs">
            {formatTime(duration)}
          </span>
        </div>

        {/* Control Buttons */}
        <div className="flex items-center justify-center gap-1">
          {/* Frame Back */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={stepBackward} className="h-8 w-8">
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Frame back (,)</p>
            </TooltipContent>
          </Tooltip>

          {/* Skip Back 5s */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => seekTo(Math.max(0, currentTime - 5))}
                className="h-8 w-8"
              >
                <SkipBack className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Back 5s (←)</p>
            </TooltipContent>
          </Tooltip>

          {/* Play/Pause */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="default" size="icon" onClick={togglePlayPause} className="h-10 w-10">
                {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{isPlaying ? 'Pause' : 'Play'} (Space)</p>
            </TooltipContent>
          </Tooltip>

          {/* Skip Forward 5s */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => seekTo(Math.min(duration, currentTime + 5))}
                className="h-8 w-8"
              >
                <SkipForward className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Forward 5s (→)</p>
            </TooltipContent>
          </Tooltip>

          {/* Frame Forward */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={stepForward} className="h-8 w-8">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Frame forward (.)</p>
            </TooltipContent>
          </Tooltip>

          {/* Spacer */}
          <div className="w-4" />

          {/* Playback Rate */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={cyclePlaybackRate}
                className="w-14 font-mono text-xs"
              >
                {playbackRate}x
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Playback speed ([ / ])</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
}
