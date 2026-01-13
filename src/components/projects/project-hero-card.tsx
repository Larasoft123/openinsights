/**
 * Project Hero Card Component
 *
 * Hero card with image overlay for project display.
 * Follows Modern Smart Home Dashboard hero card pattern.
 */

'use client';

import { FileVideo, Tag, Clock, Archive } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { ProjectActionsDropdown } from './project-actions-dropdown';

interface ProjectHeroCardProps {
  id: string;
  name: string;
  description: string | null;
  sourceThumbnails: string[];
  sourcesCount: number;
  highlightsCount: number;
  updatedAt: Date;
  archivedAt: Date | null;
  /** Callback fired after successful action - use to refresh data */
  onSuccess?: () => void;
  /** Size variant - large shows 6 thumbnails, default shows 3 */
  size?: 'default' | 'large';
}

export function ProjectHeroCard({
  id,
  name,
  description,
  sourceThumbnails,
  sourcesCount,
  highlightsCount,
  updatedAt,
  archivedAt,
  onSuccess,
  size = 'default',
}: ProjectHeroCardProps) {
  const router = useRouter();
  const isArchived = !!archivedAt;
  const hasThumbnails = sourceThumbnails.length > 0;

  return (
    <div
      onClick={() => router.push(`/projects/${id}`)}
      className="group relative h-64 cursor-pointer overflow-hidden rounded-2xl transition-all duration-300 hover:scale-[1.02]"
    >
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-purple-600" />

      {/* Thumbnail grid - 6 for large, 3 for default */}
      {hasThumbnails && (
        <div
          className={`absolute top-0 right-0 left-0 grid h-28 gap-1 p-2 ${
            size === 'large' ? 'grid-cols-6' : 'grid-cols-3'
          }`}
        >
          {sourceThumbnails.slice(0, size === 'large' ? 6 : 3).map((url, index) => (
            <div key={url} className="relative overflow-hidden rounded-md">
              <Image
                src={url}
                alt={`${name} thumbnail ${index + 1}`}
                fill
                unoptimized
                className="object-cover"
              />
            </div>
          ))}
        </div>
      )}

      {/* Dark overlay for text visibility */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-black/20" />

      {/* Archived Badge */}
      {isArchived && (
        <div className="absolute top-4 left-4 z-10 flex items-center gap-1.5 rounded-full bg-amber-500/20 px-3 py-1 text-xs font-medium text-amber-400">
          <Archive size={12} />
          <span>Archived</span>
        </div>
      )}

      {/* Actions Dropdown - wrapped to prevent card navigation on any interaction */}
      <div onClick={(e) => e.stopPropagation()}>
        <ProjectActionsDropdown
          project={{ id, name, description, archivedAt }}
          variant="card"
          onSuccess={onSuccess}
        />
      </div>

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
