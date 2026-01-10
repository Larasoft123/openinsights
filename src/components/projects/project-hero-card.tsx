/**
 * Project Hero Card Component
 *
 * Hero card with image overlay for project display.
 * Follows Modern Smart Home Dashboard hero card pattern.
 */

'use client';

import { FileVideo, Tag, Clock } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';

interface ProjectHeroCardProps {
  id: string;
  name: string;
  description: string | null;
  thumbnailUrl: string | null;
  sourcesCount: number;
  highlightsCount: number;
  updatedAt: Date;
}

export function ProjectHeroCard({
  id,
  name,
  description,
  thumbnailUrl,
  sourcesCount,
  highlightsCount,
  updatedAt,
}: ProjectHeroCardProps) {
  const router = useRouter();

  return (
    <div
      onClick={() => router.push(`/projects/${id}`)}
      className="group relative h-64 cursor-pointer overflow-hidden rounded-2xl transition-all duration-300 hover:scale-[1.02]"
    >
      {/* Background Image */}
      <div className="absolute inset-0">
        {thumbnailUrl ? (
          <Image
            src={thumbnailUrl}
            alt={name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-blue-600 to-purple-600" />
        )}
      </div>

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />

      {/* Content */}
      <div className="relative flex h-full flex-col justify-end p-6">
        <h3 className="mb-2 text-xl font-semibold text-white">{name}</h3>
        {description && <p className="mb-4 line-clamp-2 text-sm text-gray-300">{description}</p>}

        {/* Stats */}
        <div className="flex items-center gap-4 text-xs text-gray-400">
          <div className="flex items-center gap-1.5">
            <FileVideo size={14} strokeWidth={1.5} />
            <span>{sourcesCount} sources</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Tag size={14} strokeWidth={1.5} />
            <span>{highlightsCount} highlights</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock size={14} strokeWidth={1.5} />
            <span>{formatDistanceToNow(new Date(updatedAt), { addSuffix: true })}</span>
          </div>
        </div>
      </div>

      {/* Hover Border Effect */}
      <div className="group-hover:border-accent-primary/50 pointer-events-none absolute inset-0 rounded-2xl border-2 border-transparent transition-colors" />
    </div>
  );
}
