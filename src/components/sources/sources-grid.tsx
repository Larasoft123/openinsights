/**
 * Sources Grid Component
 *
 * Displays sources in a responsive grid with Device Cards.
 * Follows Modern Smart Home Dashboard grid pattern.
 */

'use client';

import { SourceDeviceCard } from './source-device-card';
import { Upload } from 'lucide-react';
import { useRouter } from 'next/navigation';

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

export function SourcesGrid({ sources, projectId }: SourcesGridProps) {
  const router = useRouter();

  if (sources.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-800 bg-gray-900/50 p-12">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-800">
          <Upload size={32} strokeWidth={1.5} className="text-gray-400" />
        </div>
        <h3 className="mb-2 text-lg font-semibold text-white">No sources yet</h3>
        <p className="mb-6 text-center text-sm text-gray-400">
          Upload your first video or audio file to start analyzing
        </p>
        <button
          onClick={() => {
            // TODO: Open upload dialog
          }}
          className="bg-accent-primary hover:bg-accent-primary/90 rounded-lg px-6 py-2.5 text-sm font-medium text-white transition-colors"
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
