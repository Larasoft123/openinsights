/**
 * Source Device Card Component
 *
 * Device card pattern for source display with image overlay.
 * Follows Modern Smart Home Dashboard device card pattern.
 */

'use client';

import { Play, Clock, FileVideo } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';

interface SourceDeviceCardProps {
  id: string;
  title: string;
  thumbnailUrl: string | null;
  duration: number | null;
  segmentsCount: number;
  status: string;
  createdAt: Date;
}

// Format duration from seconds to MM:SS or HH:MM:SS
function formatDuration(seconds: number | null): string {
  if (!seconds) return '0:00';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

// Get status badge color
function getStatusColor(status: string): string {
  switch (status) {
    case 'completed':
      return 'bg-green-600';
    case 'processing':
      return 'bg-blue-600';
    case 'failed':
      return 'bg-red-600';
    default:
      return 'bg-gray-600';
  }
}

export function SourceDeviceCard({
  id,
  title,
  thumbnailUrl,
  duration,
  segmentsCount,
  status,
  createdAt,
}: SourceDeviceCardProps) {
  const router = useRouter();

  return (
    <div
      onClick={() => router.push(`/sources/${id}`)}
      className="group relative aspect-video cursor-pointer overflow-hidden rounded-2xl transition-all duration-300 hover:scale-[1.02]"
    >
      {/* Background Image */}
      <div className="absolute inset-0">
        {thumbnailUrl ? (
          <Image
            src={thumbnailUrl}
            alt={title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
            <FileVideo size={48} strokeWidth={1.5} className="text-gray-600" />
          </div>
        )}
      </div>

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

      {/* Status Badge (Top Right) */}
      <div className="absolute top-3 right-3">
        <div
          className={`rounded-full ${getStatusColor(status)} px-3 py-1 text-xs font-medium text-white`}
        >
          {status}
        </div>
      </div>

      {/* Play Icon (Center) */}
      {status === 'completed' && (
        <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
          <div className="bg-accent-primary/90 flex h-16 w-16 items-center justify-center rounded-full backdrop-blur-sm">
            <Play size={28} strokeWidth={1.5} className="ml-1 text-white" fill="white" />
          </div>
        </div>
      )}

      {/* Content (Bottom) */}
      <div className="absolute inset-x-0 bottom-0 p-4">
        <h3 className="mb-2 text-lg font-medium text-white">{title}</h3>
        <div className="flex items-center gap-3 text-xs text-gray-400">
          <div className="flex items-center gap-1">
            <Clock size={12} strokeWidth={1.5} />
            <span>{formatDuration(duration)}</span>
          </div>
          <span>·</span>
          <span>{segmentsCount} segments</span>
          <span>·</span>
          <span>{formatDistanceToNow(new Date(createdAt), { addSuffix: true })}</span>
        </div>
      </div>

      {/* Hover Border Effect */}
      <div className="group-hover:border-accent-primary/50 pointer-events-none absolute inset-0 rounded-2xl border-2 border-transparent transition-colors" />
    </div>
  );
}
