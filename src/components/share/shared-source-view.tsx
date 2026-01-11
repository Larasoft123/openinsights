'use client';

import { useState, useRef } from 'react';
import { Play, Pause, Clock, Tag, ChevronDown, ChevronRight } from 'lucide-react';

interface HighlightTheme {
  theme: {
    id: string;
    name: string;
    color: string;
  };
}

interface Highlight {
  id: string;
  note: string | null;
  selectedText: string | null;
  tag: {
    id: string;
    name: string;
    color: string;
  };
  themes: HighlightTheme[];
}

interface Segment {
  id: string;
  content: string;
  startTime: number;
  endTime: number;
  speakerId: string | null;
  highlights: Highlight[];
}

interface SourceData {
  id: string;
  title: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  duration: number | null;
  status: string;
  summary: unknown;
  summaryStatus: string | null;
  createdAt: Date;
  project: {
    id: string;
    name: string;
  };
  segments: Segment[];
}

interface SharedSourceViewProps {
  source: SourceData;
  projectName: string;
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return '--:--';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function SharedSourceView({ source, projectName }: SharedSourceViewProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [expandedSegments, setExpandedSegments] = useState<Set<string>>(new Set());
  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement | null>(null);

  const isVideo = source.fileType.startsWith('video');

  const toggleSegment = (segmentId: string) => {
    setExpandedSegments((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(segmentId)) {
        newSet.delete(segmentId);
      } else {
        newSet.add(segmentId);
      }
      return newSet;
    });
  };

  const seekToTime = (time: number) => {
    if (mediaRef.current) {
      mediaRef.current.currentTime = time;
      if (!isPlaying) {
        mediaRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const togglePlayPause = () => {
    if (mediaRef.current) {
      if (isPlaying) {
        mediaRef.current.pause();
      } else {
        mediaRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const highlightCount = source.segments.reduce((sum, seg) => sum + seg.highlights.length, 0);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Header */}
      <header className="mb-8 rounded-2xl border border-gray-800 bg-gray-900 p-6">
        <div className="mb-4 text-sm text-gray-500">Shared Source from {projectName}</div>
        <h1 className="text-3xl font-bold text-white">{source.title}</h1>

        {/* Stats */}
        <div className="mt-6 flex flex-wrap gap-4">
          <div className="flex items-center gap-2 rounded-lg bg-gray-800 px-3 py-2">
            <Clock size={16} className="text-blue-400" />
            <span className="text-sm text-gray-300">{formatDuration(source.duration)}</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-gray-800 px-3 py-2">
            <Tag size={16} className="text-green-400" />
            <span className="text-sm text-gray-300">
              {highlightCount} highlight{highlightCount !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </header>

      {/* Media Player */}
      <section className="mb-8">
        <div className="overflow-hidden rounded-xl border border-gray-800 bg-gray-900">
          {isVideo ? (
            <video
              ref={mediaRef as React.RefObject<HTMLVideoElement>}
              src={source.fileUrl}
              className="aspect-video w-full bg-black"
              onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            />
          ) : (
            <div className="flex items-center justify-center bg-gray-950 p-8">
              <audio
                ref={mediaRef as React.RefObject<HTMLAudioElement>}
                src={source.fileUrl}
                className="w-full"
                controls
                onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
              />
            </div>
          )}

          {isVideo && (
            <div className="flex items-center gap-4 border-t border-gray-800 p-4">
              <button
                onClick={togglePlayPause}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-800 transition-colors hover:bg-gray-700"
              >
                {isPlaying ? (
                  <Pause size={20} className="text-white" />
                ) : (
                  <Play size={20} className="ml-0.5 text-white" />
                )}
              </button>
              <span className="text-sm text-gray-400">
                {formatTimestamp(currentTime)} / {formatDuration(source.duration)}
              </span>
            </div>
          )}
        </div>
      </section>

      {/* Transcript */}
      <section>
        <h2 className="mb-4 text-xl font-semibold text-white">Transcript</h2>
        <div className="space-y-2">
          {source.segments.map((segment) => {
            const hasHighlights = segment.highlights.length > 0;
            const isExpanded = expandedSegments.has(segment.id);
            const isActive = currentTime >= segment.startTime && currentTime < segment.endTime;

            return (
              <div
                key={segment.id}
                className={`rounded-lg border transition-colors ${
                  isActive ? 'border-blue-500 bg-blue-900/20' : 'border-gray-800 bg-gray-900'
                }`}
              >
                <div
                  className="flex cursor-pointer items-start gap-4 p-4 transition-colors hover:bg-gray-800/50"
                  onClick={() => seekToTime(segment.startTime)}
                >
                  <span className="mt-1 min-w-[50px] font-mono text-xs text-gray-500">
                    {formatTimestamp(segment.startTime)}
                  </span>
                  <div className="flex-1">
                    {segment.speakerId && (
                      <span className="mb-1 block text-xs font-medium text-blue-400">
                        {segment.speakerId}
                      </span>
                    )}
                    <p className="text-sm text-white">{segment.content}</p>
                  </div>
                  {hasHighlights && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSegment(segment.id);
                      }}
                      className="flex items-center gap-1 text-xs text-gray-400 hover:text-white"
                    >
                      <span>{segment.highlights.length}</span>
                      {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>
                  )}
                </div>

                {isExpanded && hasHighlights && (
                  <div className="space-y-2 border-t border-gray-800 bg-gray-800/30 p-4">
                    {segment.highlights.map((highlight) => (
                      <div key={highlight.id} className="rounded-lg bg-gray-800/50 p-3">
                        {highlight.selectedText && (
                          <p className="mb-2 text-sm text-white italic">
                            &ldquo;{highlight.selectedText}&rdquo;
                          </p>
                        )}
                        {highlight.note && (
                          <p className="mb-2 text-xs text-gray-400">Note: {highlight.note}</p>
                        )}
                        <div className="flex items-center gap-2">
                          <span
                            className="rounded px-2 py-0.5 text-xs font-medium"
                            style={{
                              backgroundColor: `${highlight.tag.color}20`,
                              color: highlight.tag.color,
                            }}
                          >
                            {highlight.tag.name}
                          </span>
                          {highlight.themes.map(({ theme }) => (
                            <span
                              key={theme.id}
                              className="rounded px-2 py-0.5 text-xs"
                              style={{
                                backgroundColor: `${theme.color}20`,
                                color: theme.color,
                              }}
                            >
                              {theme.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
