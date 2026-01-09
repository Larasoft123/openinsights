'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { SourceStatusBadge } from './source-status-badge';

type ProcessingStatus = 'PENDING' | 'UPLOADING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

interface Source {
  id: string;
  title: string;
  fileName: string;
  fileType: string;
  status: ProcessingStatus;
  duration: number | null;
  createdAt: string;
  updatedAt: string;
  processingStep: string | null;
  processingProgress: number | null;
  processingStartedAt: string | null;
}

interface SourceListProps {
  projectId: string;
  initialSources: Source[];
}

function formatDuration(seconds: number | null): string {
  if (seconds === null) return '--:--';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getFileIcon(fileType: string): React.ReactNode {
  const isVideo = fileType.startsWith('video/');
  return isVideo ? (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
      />
    </svg>
  ) : (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
      />
    </svg>
  );
}

export function SourceList({ projectId, initialSources }: SourceListProps) {
  const [sources, setSources] = useState<Source[]>(initialSources);

  // Check if any sources are in a pending state that needs polling
  const hasPendingSources = sources.some(
    (s) => s.status === 'UPLOADING' || s.status === 'PROCESSING'
  );

  // Poll for updates when there are pending sources
  useEffect(() => {
    if (!hasPendingSources) return;

    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}/sources`);
        if (res.ok) {
          const data = await res.json();
          setSources(data.sources);
        }
      } catch {
        // Ignore polling errors silently
      }
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(pollInterval);
  }, [projectId, hasPendingSources]);

  // Update sources when new ones are added from parent
  useEffect(() => {
    setSources(initialSources);
  }, [initialSources]);

  if (sources.length === 0) {
    return (
      <Card className="flex flex-col items-center justify-center p-8 text-center">
        <svg
          className="text-muted-foreground mb-4 h-12 w-12"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"
          />
        </svg>
        <h3 className="font-medium">No sources yet</h3>
        <p className="text-muted-foreground mt-1 text-sm">
          Upload video or audio files to get started with your research.
        </p>
      </Card>
    );
  }

  const renderSourceCard = (source: Source) => {
    const isClickable = source.status === 'COMPLETED';

    const cardContent = (
      <Card
        className={`flex items-center gap-4 p-4 transition-shadow ${
          isClickable ? 'cursor-pointer hover:shadow-md' : ''
        }`}
      >
        {/* File Type Icon */}
        <div className="text-muted-foreground flex-shrink-0">{getFileIcon(source.fileType)}</div>

        {/* Source Info */}
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{source.title}</p>
          <p className="text-muted-foreground text-xs">
            {source.fileName} &middot; {formatDate(source.createdAt)}
            {source.duration !== null && <> &middot; {formatDuration(source.duration)}</>}
          </p>
        </div>

        {/* Status Badge */}
        <div className="flex-shrink-0">
          <SourceStatusBadge
            status={source.status}
            processingStep={source.processingStep}
            processingProgress={source.processingProgress}
            processingStartedAt={source.processingStartedAt}
            duration={source.duration}
          />
        </div>

        {/* Arrow for clickable items */}
        {isClickable && (
          <svg
            className="text-muted-foreground h-5 w-5 flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        )}
      </Card>
    );

    if (isClickable) {
      return (
        <Link key={source.id} href={`/sources/${source.id}`}>
          {cardContent}
        </Link>
      );
    }

    return <div key={source.id}>{cardContent}</div>;
  };

  return <div className="space-y-3">{sources.map(renderSourceCard)}</div>;
}
