'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatTimeWithOptions } from '@/lib/utils/time';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

type ProcessingStatus = 'PENDING' | 'UPLOADING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

interface SourceStatusBadgeProps {
  status: ProcessingStatus;
  processingStep?: string | null;
  processingProgress?: number | null;
  processingStartedAt?: string | null;
  duration?: number | null;
  className?: string;
  onRetry?: () => void;
  isRetrying?: boolean;
  onCancel?: () => void;
  isCancelling?: boolean;
}

const statusConfig: Record<
  ProcessingStatus,
  { label: string; className: string; showSpinner?: boolean }
> = {
  PENDING: {
    label: 'Pending',
    className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  },
  UPLOADING: {
    label: 'Uploading',
    className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    showSpinner: true,
  },
  PROCESSING: {
    label: 'Processing',
    className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    showSpinner: true,
  },
  COMPLETED: {
    label: 'Completed',
    className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  },
  FAILED: {
    label: 'Failed',
    className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  },
};

export function SourceStatusBadge({
  status,
  processingStep,
  processingProgress,
  processingStartedAt,
  duration,
  className,
  onRetry,
  isRetrying,
  onCancel,
  isCancelling,
}: SourceStatusBadgeProps) {
  const config = statusConfig[status];
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

  // For PROCESSING status, show detailed progress
  if (status === 'PROCESSING' && processingStep) {
    if (processingStep === 'transcribing') {
      // Estimate: ~2x video duration for transcription
      const estimatedTotal = duration ? duration * 2 : null;
      const estimatedRemaining = estimatedTotal ? Math.max(0, estimatedTotal - elapsedTime) : null;

      return (
        <div className={cn('flex items-center gap-2', className)}>
          <div className="flex flex-col gap-1">
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
                config.className
              )}
            >
              <LoadingSpinner size="sm" />
              Transcribing
            </span>
            <span className="text-muted-foreground text-xs">
              {(seconds: number) =>
                formatTimeWithOptions(seconds, { shortFormat: true })(elapsedTime)
              }{' '}
              elapsed
              {estimatedRemaining !== null &&
                ` / ~${(seconds: number) => formatTimeWithOptions(seconds, { shortFormat: true })(estimatedRemaining)} left`}
            </span>
          </div>
          {onCancel && (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-destructive h-6 w-6 p-0"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onCancel();
              }}
              disabled={isCancelling}
              title="Cancel processing"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      );
    }

    if (processingStep === 'vectorizing') {
      const progress = processingProgress ?? 0;

      return (
        <div className={cn('flex items-center gap-2', className)}>
          <div className="flex flex-col gap-1">
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
                config.className
              )}
            >
              <LoadingSpinner size="sm" />
              Embedding {progress}%
            </span>
            {/* Progress bar */}
            <div className="bg-muted h-1.5 w-24 overflow-hidden rounded-full">
              <div
                className="h-full bg-yellow-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          {onCancel && (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-destructive h-6 w-6 p-0"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onCancel();
              }}
              disabled={isCancelling}
              title="Cancel processing"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      );
    }
  }

  // Failed status with retry button
  if (status === 'FAILED' && onRetry) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
            config.className
          )}
        >
          {config.label}
        </span>
        <Button
          variant="outline"
          size="sm"
          className="h-6 px-2 text-xs"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRetry();
          }}
          disabled={isRetrying}
        >
          <RefreshCw className={cn('mr-1 h-3 w-3', isRetrying && 'animate-spin')} />
          {isRetrying ? 'Retrying...' : 'Retry'}
        </Button>
      </div>
    );
  }

  // Default badge display with optional cancel for processing states
  const showCancel = onCancel && (status === 'PROCESSING' || status === 'UPLOADING');

  if (showCancel) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
            config.className
          )}
        >
          {config.showSpinner && <LoadingSpinner size="sm" />}
          {config.label}
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-destructive h-6 w-6 p-0"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onCancel();
          }}
          disabled={isCancelling}
          title="Cancel processing"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
        config.className,
        className
      )}
    >
      {config.showSpinner && <LoadingSpinner size="sm" />}
      {config.label}
    </span>
  );
}
