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
    <div className="group relative overflow-hidden rounded-xl border border-gray-800 bg-gray-900 transition-all hover:border-gray-700">
      {/* Thumbnail / Status */}
      <div className="relative aspect-video bg-gray-800">
        {isCompleted ? (
          <>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100">
                <Play className="h-5 w-5" />
              </div>
            </div>
            <div className="absolute right-2 bottom-2 rounded bg-black/70 px-2 py-0.5 text-xs text-white">
              {source.duration && formatDuration(source.duration)}
            </div>
          </>
        ) : isProcessing ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <Loader2 className="mb-2 h-8 w-8 animate-spin text-blue-500" />
            <p className="text-sm text-gray-400">{source.processingStep}</p>
            <div className="mt-2 h-1.5 w-32 overflow-hidden rounded-full bg-gray-700">
              <div
                className="h-full rounded-full bg-blue-500 transition-all"
                style={{ width: `${source.processingProgress}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">{source.processingProgress}%</p>
          </div>
        ) : null}
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="mb-2 flex items-start justify-between">
          <h3 className="font-medium text-white">{source.title}</h3>
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
        <div className="flex items-center gap-3 text-xs text-gray-500">
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
      className="flex aspect-video flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-700 bg-gray-900/50 transition-colors hover:border-gray-600 hover:bg-gray-900"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-800">
        <Upload className="h-5 w-5 text-gray-400" />
      </div>
      <p className="mt-3 text-sm font-medium text-gray-300">Upload Source</p>
      <p className="mt-1 text-xs text-gray-500">MP4, WebM, MP3, WAV (max 2GB)</p>
    </button>
  );
}

export default function ProjectMockupPage() {
  return (
    <div className="min-h-screen bg-gray-950 p-8">
      {/* Header */}
      <div className="mb-8">
        <nav className="mb-4 flex items-center gap-2 text-sm text-gray-400">
          <span>Acme Research</span>
          <span>/</span>
          <span className="text-white">Q4 Product Research</span>
        </nav>

        {/* Project Hero */}
        <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-white">Q4 Product Research</h1>
              <p className="mt-2 max-w-2xl text-gray-400">
                User interviews and usability tests for the dashboard redesign project. Focus on
                navigation patterns and export functionality.
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-6 flex gap-8">
            <div>
              <p className="text-2xl font-semibold text-white">4</p>
              <p className="text-sm text-gray-500">Sources</p>
            </div>
            <div>
              <p className="text-2xl font-semibold text-white">20</p>
              <p className="text-sm text-gray-500">Highlights</p>
            </div>
            <div>
              <p className="text-2xl font-semibold text-white">3</p>
              <p className="text-sm text-gray-500">Themes</p>
            </div>
          </div>
        </div>
      </div>

      {/* Sources Grid */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-medium text-white">Sources</h2>
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
