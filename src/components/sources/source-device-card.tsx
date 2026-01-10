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
import { useState } from 'react';

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
  onEdit,
  onTrash,
  onRetry,
  onCancel,
  processingStep,
  processingProgress,
  processingStartedAt,
  isRetrying = false,
  isCancelling = false,
}: SourceDeviceCardProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleCardClick = (e: React.MouseEvent) => {
    // Only navigate if status is COMPLETED
    if (status === 'COMPLETED') {
      router.push(`/sources/${id}`);
    }
  };

  const handleMenuClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setMenuOpen(!menuOpen);
  };

  const handleMenuAction = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    setMenuOpen(false);
    action();
  };

  const isProcessing = status === 'PROCESSING' || status === 'UPLOADING';
  const isFailed = status === 'FAILED';

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

      {/* Status Badge (Top Left) */}
      <div className="absolute top-3 left-3">
        <div
          className={`rounded-full ${getStatusColor(status)} px-3 py-1 text-xs font-medium text-white`}
        >
          {status}
        </div>
      </div>

      {/* Actions Menu (Top Right) */}
      <div className="absolute top-3 right-3 z-10">
        <button
          onClick={handleMenuClick}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100 hover:bg-black/80"
          style={{ pointerEvents: 'auto' }}
        >
          <MoreVertical size={16} strokeWidth={1.5} />
        </button>

        {/* Dropdown Menu */}
        {menuOpen && (
          <>
            {/* Backdrop to close menu */}
            <div
              className="fixed inset-0 z-10"
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(false);
              }}
            />

            {/* Menu */}
            <div className="absolute top-10 right-0 z-20 w-48 rounded-lg border border-gray-800 bg-gray-900 py-1 shadow-lg">
              {onEdit && (
                <button
                  onClick={(e) => handleMenuAction(e, onEdit)}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-white transition-colors hover:bg-gray-800"
                >
                  <Edit2 size={14} strokeWidth={1.5} />
                  Edit
                </button>
              )}

              {isFailed && onRetry && (
                <button
                  onClick={(e) => handleMenuAction(e, onRetry)}
                  disabled={isRetrying}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-blue-400 transition-colors hover:bg-gray-800 disabled:opacity-50"
                >
                  <RotateCw
                    size={14}
                    strokeWidth={1.5}
                    className={isRetrying ? 'animate-spin' : ''}
                  />
                  {isRetrying ? 'Retrying...' : 'Retry'}
                </button>
              )}

              {isProcessing && onCancel && (
                <button
                  onClick={(e) => handleMenuAction(e, onCancel)}
                  disabled={isCancelling}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-orange-400 transition-colors hover:bg-gray-800 disabled:opacity-50"
                >
                  <X size={14} strokeWidth={1.5} />
                  {isCancelling ? 'Cancelling...' : 'Cancel'}
                </button>
              )}

              {onTrash && (
                <button
                  onClick={(e) => handleMenuAction(e, onTrash)}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-400 transition-colors hover:bg-gray-800"
                >
                  <Trash2 size={14} strokeWidth={1.5} />
                  Move to Trash
                </button>
              )}
            </div>
          </>
        )}
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
            {processingProgress !== null && processingProgress !== undefined && (
              <p className="text-xs text-gray-300">{processingProgress}%</p>
            )}
          </div>
        </div>
      )}

      {/* Content (Bottom) */}
      <div className="absolute inset-x-0 bottom-0 p-4">
        <h3 className="mb-2 line-clamp-1 text-lg font-medium text-white">{title}</h3>
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
        {isProcessing && processingStep && (
          <p className="text-xs text-gray-300">{processingStep}</p>
        )}
        {isFailed && <p className="text-xs text-red-400">Processing failed - use menu to retry</p>}
        {status === 'PENDING' && <p className="text-xs text-gray-400">Waiting to process...</p>}
      </div>

      {/* Hover Border Effect */}
      <div className="group-hover:border-accent-primary/50 pointer-events-none absolute inset-0 rounded-2xl border-2 border-transparent transition-colors" />
    </div>
  );
}
