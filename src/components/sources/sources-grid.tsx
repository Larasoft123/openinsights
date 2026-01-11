/**
 * Sources Grid Component
 *
 * Displays sources in a responsive grid with Device Cards.
 * Follows Modern Smart Home Dashboard grid pattern.
 */

'use client';

import { SourceDeviceCard } from './source-device-card';
import { Upload } from 'lucide-react';

interface Source {
  id: string;
  title: string;
  thumbnailUrl: string | null;
  duration: number | null;
  status: string;
  createdAt: Date;
  _count: {
    segments: number;
  };
}

interface SourcesGridProps {
  sources: Source[];
  projectId: string;
}

export function SourcesGrid({ sources, projectId: _ }: SourcesGridProps) {
  void _; // Reserved for future use

  if (sources.length === 0) {
    return (
      <div className="border-border bg-card/50 flex flex-col items-center justify-center rounded-2xl border border-dashed p-12">
        <div className="bg-card mb-4 flex h-16 w-16 items-center justify-center rounded-full">
          <Upload size={32} strokeWidth={1.5} className="text-muted-foreground" />
        </div>
        <h3 className="text-foreground mb-2 text-lg font-semibold">No sources yet</h3>
        <p className="text-muted-foreground mb-6 text-center text-sm">
          Upload your first video or audio file to start analyzing
        </p>
        <button
          onClick={() => {
            // TODO: Open upload dialog
          }}
          className="bg-accent-primary hover:bg-accent-primary/90 text-foreground rounded-lg px-6 py-2.5 text-sm font-medium transition-colors"
        >
          Upload Source
        </button>
      </div>
    );
  }

  return (
    <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
      {sources.map((source) => (
        <SourceDeviceCard
          key={source.id}
          id={source.id}
          title={source.title}
          thumbnailUrl={source.thumbnailUrl}
          duration={source.duration}
          segmentsCount={source._count.segments}
          status={source.status}
          createdAt={source.createdAt}
        />
      ))}
    </div>
  );
}
