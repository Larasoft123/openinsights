'use client';

import { useRef } from 'react';
import { useVideoSync } from '../hooks/use-video-sync';
import { PlaybackControls } from './playback-controls';
import { cn } from '@/lib/utils';

interface VideoPlayerProps {
  src: string;
  title?: string;
  className?: string;
}

/**
 * VideoPlayer Component
 *
 * Renders HTML5 video with synchronized playback controls.
 * Uses useVideoSync hook to bridge with Zustand store.
 */
export function VideoPlayer({ src, title, className }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { togglePlayPause } = useVideoSync(videoRef);

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {/* Video Element */}
      <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black">
        <video
          ref={videoRef}
          src={src}
          className="h-full w-full object-contain"
          onClick={togglePlayPause}
          playsInline
          preload="metadata"
        >
          {title && <track kind="captions" label={title} />}
        </video>
      </div>

      {/* Playback Controls */}
      <PlaybackControls videoRef={videoRef} />
    </div>
  );
}
