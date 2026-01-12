'use client';

import { Upload, Play, Clock, FileText, CheckCircle, Loader2 } from 'lucide-react';

/**
 * Project Mockup Page
 *
 * Static mockup of the Project page with sources for screenshots.
 * Shows sources in various processing states.
 */

const DEMO_SOURCES = [
  {
    id: 's-1',
    title: 'User Interview - Sarah M.',
    fileName: 'sarah_interview.mp4',
    status: 'COMPLETED' as const,
    duration: 185,
    highlightCount: 12,
    tags: [
      { id: 't-1', name: 'Pain Point', color: '#EF4444' },
      { id: 't-2', name: 'Feature Request', color: '#A855F7' },
    ],
    createdAt: '2 hours ago',
  },
  {
    id: 's-2',
    title: 'User Interview - John D.',
    fileName: 'john_interview.mp4',
    status: 'COMPLETED' as const,
    duration: 243,
    highlightCount: 8,
    tags: [{ id: 't-3', name: 'Positive Feedback', color: '#22C55E' }],
    createdAt: '5 hours ago',
  },
  {
    id: 's-3',
    title: 'Focus Group Session',
    fileName: 'focus_group_q4.mp4',
    status: 'PROCESSING' as const,
    duration: null,
    highlightCount: 0,
    tags: [],
    processingStep: 'Transcribing...',
    processingProgress: 45,
    createdAt: '10 minutes ago',
  },
  {
    id: 's-4',
    title: 'Usability Test - Mike R.',
    fileName: 'mike_usability.mp4',
    status: 'PROCESSING' as const,
    duration: null,
    highlightCount: 0,
    tags: [],
    processingStep: 'Generating embeddings...',
    processingProgress: 78,
    createdAt: '25 minutes ago',
  },
];

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function SourceCard({ source }: { source: (typeof DEMO_SOURCES)[0] }) {
  const isProcessing = source.status === 'PROCESSING';
  const isCompleted = source.status === 'COMPLETED';

  return (
    <div className="group border-border bg-background hover:border-border relative overflow-hidden rounded-xl border transition-all">
      {/* Thumbnail / Status */}
      <div className="bg-muted relative aspect-video">
        {isCompleted ? (
          <>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-foreground flex h-12 w-12 items-center justify-center rounded-full bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
                <Play className="h-5 w-5" />
              </div>
            </div>
            <div className="text-foreground absolute right-2 bottom-2 rounded bg-black/70 px-2 py-0.5 text-xs">
              {source.duration && formatDuration(source.duration)}
            </div>
          </>
        ) : isProcessing ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <Loader2 className="mb-2 h-8 w-8 animate-spin text-blue-500" />
            <p className="text-muted-foreground text-sm">{source.processingStep}</p>
            <div className="bg-muted mt-2 h-1.5 w-32 overflow-hidden rounded-full">
              <div
                className="h-full rounded-full bg-blue-500 transition-all"
                style={{ width: `${source.processingProgress}%` }}
              />
            </div>
            <p className="text-muted-foreground mt-1 text-xs">{source.processingProgress}%</p>
          </div>
        ) : null}
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="mb-2 flex items-start justify-between">
          <h3 className="text-foreground font-medium">{source.title}</h3>
          {isCompleted && <CheckCircle className="h-4 w-4 flex-shrink-0 text-green-500" />}
        </div>

        {/* Tags */}
        {source.tags.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1">
            {source.tags.map((tag) => (
              <span
                key={tag.id}
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs"
                style={{
                  backgroundColor: `${tag.color}20`,
                  color: tag.color,
                }}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: tag.color }} />
                {tag.name}
              </span>
            ))}
          </div>
        )}

        {/* Meta */}
        <div className="text-muted-foreground flex items-center gap-3 text-xs">
          {isCompleted && (
            <span className="flex items-center gap-1">
              <FileText className="h-3 w-3" />
              {source.highlightCount} highlights
            </span>
          )}
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {source.createdAt}
          </span>
        </div>
      </div>
    </div>
  );
}

function UploadCard({ onUpload }: { onUpload: () => void }) {
  return (
    <button
      onClick={onUpload}
      className="border-border bg-background/50 hover:bg-background flex aspect-video flex-col items-center justify-center rounded-xl border-2 border-dashed transition-colors hover:border-gray-600"
    >
      <div className="bg-muted flex h-12 w-12 items-center justify-center rounded-full">
        <Upload className="text-muted-foreground h-5 w-5" />
      </div>
      <p className="text-muted-foreground mt-3 text-sm font-medium">Upload Source</p>
      <p className="text-muted-foreground mt-1 text-xs">MP4, WebM, MP3, WAV (max 2GB)</p>
    </button>
  );
}

export default function ProjectMockupPage() {
  return (
    <div className="bg-background min-h-screen p-8">
      {/* Header */}
      <div className="mb-8">
        <nav className="text-muted-foreground mb-4 flex items-center gap-2 text-sm">
          <span>Acme Research</span>
          <span>/</span>
          <span className="text-foreground">Q4 Product Research</span>
        </nav>

        {/* Project Hero */}
        <div className="border-border bg-background rounded-2xl border p-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-foreground text-2xl font-semibold">Q4 Product Research</h1>
              <p className="text-muted-foreground mt-2 max-w-2xl">
                User interviews and usability tests for the dashboard redesign project. Focus on
                navigation patterns and export functionality.
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-6 flex gap-8">
            <div>
              <p className="text-foreground text-2xl font-semibold">4</p>
              <p className="text-muted-foreground text-sm">Sources</p>
            </div>
            <div>
              <p className="text-foreground text-2xl font-semibold">20</p>
              <p className="text-muted-foreground text-sm">Highlights</p>
            </div>
            <div>
              <p className="text-foreground text-2xl font-semibold">3</p>
              <p className="text-muted-foreground text-sm">Themes</p>
            </div>
          </div>
        </div>
      </div>

      {/* Sources Grid */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-foreground text-lg font-medium">Sources</h2>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <UploadCard onUpload={() => {}} />
          {DEMO_SOURCES.map((source) => (
            <SourceCard key={source.id} source={source} />
          ))}
        </div>
      </div>
    </div>
  );
}
