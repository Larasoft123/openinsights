/**
 * Source Device Card Component
 *
 * Device card pattern for source display with image overlay.
 * Follows Modern Smart Home Dashboard device card pattern.
 */

'use client';

import { Play, Clock, FileVideo, MoreVertical, Edit2, Trash2, RotateCw, X } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { useState, useEffect } from 'react';
import { useShareContext } from '@/lib/contexts/read-only-context';
import { formatTimeWithOptions } from '@/lib/utils/time';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';

interface SourceDeviceCardProps {
  id: string;
  title: string;
  thumbnailUrl: string | null;
  duration: number | null;
  segmentsCount: number;
  status: string;
  createdAt: Date;
  onEdit?: () => void;
  onTrash?: () => void;
  onRetry?: () => void;
  onCancel?: () => void;
  processingStep?: string | null;
  processingProgress?: number | null;
  processingStartedAt?: string | null;
  isRetrying?: boolean;
  isCancelling?: boolean;
  variant?: 'grid' | 'list';
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

export function SourceDeviceCard({
  id,
  title,
  thumbnailUrl,
  duration,
  segmentsCount,
  status,
  createdAt,
  onEdit,
  onTrash,
  onRetry,
  onCancel,
  processingStep,
  processingProgress,
  processingStartedAt,
  isRetrying = false,
  isCancelling = false,
  variant = 'grid',
}: SourceDeviceCardProps) {
  const router = useRouter();
  const { basePath } = useShareContext();
  const [elapsedTime, setElapsedTime] = useState(0);

  // Update elapsed time every second when transcribing
  useEffect(() => {
    if (status !== 'PROCESSING' || processingStep !== 'transcribing' || !processingStartedAt) {
      return;
    }

    const startTime = new Date(processingStartedAt).getTime();

    const updateElapsed = () => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);

    return () => clearInterval(interval);
  }, [status, processingStep, processingStartedAt]);

  const handleCardClick = () => {
    // Only navigate if status is COMPLETED
    if (status === 'COMPLETED') {
      // Use basePath for shared views, otherwise use default sources path
      const sourcePath = basePath ? `${basePath}/sources/${id}` : `/sources/${id}`;
      router.push(sourcePath);
    }
  };

  const isProcessing = status === 'PROCESSING' || status === 'UPLOADING';
  const isFailed = status === 'FAILED';

  // List View Layout
  if (variant === 'list') {
    return (
      <div
        onClick={handleCardClick}
        className={`group flex overflow-hidden rounded-2xl border border-gray-800 bg-gray-900 transition-all duration-300 ${
          status === 'COMPLETED' ? 'hover:border-accent-primary/50 cursor-pointer' : ''
        }`}
      >
        {/* Thumbnail */}
        <div className="relative h-32 w-48 flex-shrink-0">
          {thumbnailUrl ? (
            <Image
              src={thumbnailUrl}
              alt={title}
              fill
              unoptimized
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
              <FileVideo size={32} strokeWidth={1.5} className="text-gray-600" />
            </div>
          )}

          {/* Processing Indicator */}
          {isProcessing && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex flex-1 items-center justify-between gap-4 p-4">
          {/* Left: Title and Metadata */}
          <div className="flex-1 space-y-2">
            <h3 className="line-clamp-1 text-lg font-medium text-white">{title}</h3>
            {status === 'COMPLETED' && (
              <div className="flex items-center gap-3 text-sm text-gray-400">
                <div className="flex items-center gap-1">
                  <Clock size={14} strokeWidth={1.5} />
                  <span>{formatDuration(duration)}</span>
                </div>
                <span>·</span>
                <span>{segmentsCount} segments</span>
                <span>·</span>
                <span>{formatDistanceToNow(new Date(createdAt), { addSuffix: true })}</span>
              </div>
            )}
            {isProcessing && processingStep && (
              <p className="text-sm text-gray-400">
                {processingStep}
                {processingStep === 'transcribing' && (
                  <span className="ml-2">
                    ({formatTimeWithOptions(elapsedTime, { shortFormat: true })} elapsed
                    {duration &&
                      ` / ~${formatTimeWithOptions(Math.max(0, duration * 2 - elapsedTime), { shortFormat: true })} left`}
                    )
                  </span>
                )}
                {processingStep !== 'transcribing' &&
                  processingProgress !== null &&
                  processingProgress !== undefined && (
                    <span className="ml-2">({processingProgress}%)</span>
                  )}
              </p>
            )}
            {isFailed && (
              <p className="text-sm text-red-400">Processing failed - use menu to retry</p>
            )}
          </div>

          {/* Right: Menu */}
          <div className="flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  onClick={(e) => e.stopPropagation()}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-800 text-white transition-colors hover:bg-gray-700"
                >
                  <MoreVertical size={16} strokeWidth={1.5} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {onEdit && (
                  <DropdownMenuItem onClick={onEdit}>
                    <Edit2 size={14} strokeWidth={1.5} />
                    Edit
                  </DropdownMenuItem>
                )}

                {isFailed && onRetry && (
                  <DropdownMenuItem
                    onClick={onRetry}
                    disabled={isRetrying}
                    className="text-blue-400 hover:text-blue-300 focus:text-blue-300"
                  >
                    <RotateCw
                      size={14}
                      strokeWidth={1.5}
                      className={isRetrying ? 'animate-spin' : ''}
                    />
                    {isRetrying ? 'Retrying...' : 'Retry'}
                  </DropdownMenuItem>
                )}

                {isProcessing && onCancel && (
                  <DropdownMenuItem
                    onClick={onCancel}
                    disabled={isCancelling}
                    className="text-orange-400 hover:text-orange-300 focus:text-orange-300"
                  >
                    <X size={14} strokeWidth={1.5} />
                    {isCancelling ? 'Cancelling...' : 'Cancel'}
                  </DropdownMenuItem>
                )}

                {onTrash && (
                  <DropdownMenuItem onClick={onTrash} variant="destructive">
                    <Trash2 size={14} strokeWidth={1.5} />
                    Move to Trash
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    );
  }

  // Grid View Layout (default)
  return (
    <div
      onClick={handleCardClick}
      className={`group relative aspect-video overflow-hidden rounded-2xl transition-all duration-300 ${
        status === 'COMPLETED' ? 'cursor-pointer hover:scale-[1.02]' : ''
      }`}
    >
      {/* Background Image */}
      <div className="absolute inset-0">
        {thumbnailUrl ? (
          <Image
            src={thumbnailUrl}
            alt={title}
            fill
            unoptimized
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

      {/* Top Right: Actions Menu */}
      <div className="absolute top-3 right-3 z-10">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              onClick={(e) => e.stopPropagation()}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100 hover:bg-black/80"
              style={{ pointerEvents: 'auto' }}
            >
              <MoreVertical size={16} strokeWidth={1.5} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {onEdit && (
              <DropdownMenuItem onClick={onEdit}>
                <Edit2 size={14} strokeWidth={1.5} />
                Edit
              </DropdownMenuItem>
            )}

            {isFailed && onRetry && (
              <DropdownMenuItem
                onClick={onRetry}
                disabled={isRetrying}
                className="text-blue-400 hover:text-blue-300 focus:text-blue-300"
              >
                <RotateCw
                  size={14}
                  strokeWidth={1.5}
                  className={isRetrying ? 'animate-spin' : ''}
                />
                {isRetrying ? 'Retrying...' : 'Retry'}
              </DropdownMenuItem>
            )}

            {isProcessing && onCancel && (
              <DropdownMenuItem
                onClick={onCancel}
                disabled={isCancelling}
                className="text-orange-400 hover:text-orange-300 focus:text-orange-300"
              >
                <X size={14} strokeWidth={1.5} />
                {isCancelling ? 'Cancelling...' : 'Cancel'}
              </DropdownMenuItem>
            )}

            {onTrash && (
              <DropdownMenuItem onClick={onTrash} variant="destructive">
                <Trash2 size={14} strokeWidth={1.5} />
                Move to Trash
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Play Icon (Center) */}
      {status === 'COMPLETED' && (
        <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
          <div className="bg-accent-primary/90 flex h-16 w-16 items-center justify-center rounded-full backdrop-blur-sm">
            <Play size={28} strokeWidth={1.5} className="ml-1 text-white" fill="white" />
          </div>
        </div>
      )}

      {/* Processing Indicator (Center) */}
      {isProcessing && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2 rounded-lg bg-black/70 px-6 py-4 backdrop-blur-sm">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent" />
            {processingStep && <p className="text-xs text-white">{processingStep}</p>}
            {/* For transcribing: show elapsed time (no progress from LLM) */}
            {processingStep === 'transcribing' && (
              <p className="text-xs text-gray-300">
                {formatTimeWithOptions(elapsedTime, { shortFormat: true })} elapsed
                {duration &&
                  ` / ~${formatTimeWithOptions(Math.max(0, duration * 2 - elapsedTime), { shortFormat: true })} left`}
              </p>
            )}
            {/* For other steps: show percentage if available */}
            {processingStep !== 'transcribing' &&
              processingProgress !== null &&
              processingProgress !== undefined && (
                <p className="text-xs text-gray-300">{processingProgress}%</p>
              )}
          </div>
        </div>
      )}

      {/* Content (Bottom) */}
      <div className="absolute inset-x-0 bottom-0 space-y-2 p-4">
        <h3 className="line-clamp-1 text-lg font-medium text-white">{title}</h3>

        {status === 'COMPLETED' && (
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
        )}

        {isFailed && <p className="text-xs text-red-400">Processing failed - use menu to retry</p>}
        {status === 'PENDING' && <p className="text-xs text-gray-400">Waiting to process...</p>}
      </div>

      {/* Hover Border Effect */}
      <div className="group-hover:border-accent-primary/50 pointer-events-none absolute inset-0 rounded-2xl border-2 border-transparent transition-colors" />
    </div>
  );
}
