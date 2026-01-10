/**
 * Project Hero Section Component
 *
 * Large hero section with project image, title, and stats badges.
 * Follows Modern Smart Home Dashboard hero pattern.
 */

'use client';

import { FileVideo, Tag, Clock } from 'lucide-react';
import Image from 'next/image';
import { formatDistanceToNow } from 'date-fns';

interface ProjectHeroSectionProps {
  name: string;
  description: string | null;
  thumbnailUrl: string | null;
  sourcesCount: number;
  highlightsCount: number;
  updatedAt: Date;
}

export function ProjectHeroSection({
  name,
  description,
  thumbnailUrl,
  sourcesCount,
  highlightsCount,
  updatedAt,
}: ProjectHeroSectionProps) {
  return (
    <div className="relative h-48 overflow-hidden rounded-2xl">
      {/* Background Image */}
      <div className="absolute inset-0">
        {thumbnailUrl ? (
          <Image src={thumbnailUrl} alt={name} fill className="object-cover" priority />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-blue-600 to-purple-600" />
        )}
      </div>

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />

      {/* Stats Badges (Top Right) */}
      <div className="absolute top-4 right-4 flex gap-2">
        <div className="flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 backdrop-blur-sm">
          <FileVideo size={14} strokeWidth={1.5} className="text-purple-400" />
          <span className="text-xs font-medium text-white">{sourcesCount}</span>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 backdrop-blur-sm">
          <Tag size={14} strokeWidth={1.5} className="text-green-400" />
          <span className="text-xs font-medium text-white">{highlightsCount}</span>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 backdrop-blur-sm">
          <Clock size={14} strokeWidth={1.5} className="text-blue-400" />
          <span className="text-xs font-medium text-white">
            {formatDistanceToNow(new Date(updatedAt), { addSuffix: true })}
          </span>
        </div>
      </div>

      {/* Content (Bottom) */}
      <div className="absolute inset-x-0 bottom-0 p-6">
        <h1 className="mb-2 text-2xl font-bold text-white">{name}</h1>
        {description && (
          <p className="line-clamp-1 max-w-2xl text-sm text-gray-300">{description}</p>
        )}
      </div>
    </div>
  );
}
