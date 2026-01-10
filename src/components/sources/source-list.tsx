'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { TagBadge } from '@/components/ui/tag-badge';
import { formatTimeWithOptions, formatDate } from '@/lib/utils/time';
import { SourceStatusBadge } from './source-status-badge';
import { SourceActionsMenu } from './source-actions-menu';
import { SourceEditDialog } from './source-edit-dialog';
import { SourceTrashDialog } from './source-trash-dialog';

type ProcessingStatus = 'PENDING' | 'UPLOADING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

interface Tag {
  id: string;
  name: string;
  color: string;
}

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
  tags?: Tag[];
  highlightCount?: number;
}

interface SourceListProps {
  projectId: string;
  initialSources: Source[];
  searchQuery?: string;
  selectedTags?: string[];
  onSourceUpdated?: () => void;
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

export function SourceList({
  projectId,
  initialSources,
  searchQuery = '',
  selectedTags = [],
  onSourceUpdated,
}: SourceListProps) {
  const [sources, setSources] = useState<Source[]>(initialSources);
  const [editingSource, setEditingSource] = useState<Source | null>(null);
  const [trashingSource, setTrashingSource] = useState<Source | null>(null);
  const [retryingSourceId, setRetryingSourceId] = useState<string | null>(null);
  const [cancellingSourceId, setCancellingSourceId] = useState<string | null>(null);

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

  // Update sources when initialSources change
  useEffect(() => {
    setSources(initialSources);
  }, [initialSources]);

  // Filter sources based on search query and selected tags
  const filteredSources = sources.filter((source) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        source.title.toLowerCase().includes(query) || source.fileName.toLowerCase().includes(query);
      if (!matchesSearch) return false;
    }

    // Tag filter
    if (selectedTags.length > 0) {
      const sourceTags = source.tags?.map((t) => t.id) || [];
      const hasMatchingTag = selectedTags.some((tagId) => sourceTags.includes(tagId));
      if (!hasMatchingTag) return false;
    }

    return true;
  });

  const handleSourceUpdated = (sourceId: string, newTitle: string) => {
    setSources((prev) => prev.map((s) => (s.id === sourceId ? { ...s, title: newTitle } : s)));
    onSourceUpdated?.();
  };

  const handleSourceTrashed = (sourceId: string) => {
    setSources((prev) => prev.filter((s) => s.id !== sourceId));
    onSourceUpdated?.();
  };

  const handleRetry = async (sourceId: string) => {
    setRetryingSourceId(sourceId);
    try {
      const res = await fetch(`/api/projects/${projectId}/sources/${sourceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ retry: true }),
      });

      if (res.ok) {
        // Update local state to show PROCESSING status
        setSources((prev) =>
          prev.map((s) =>
            s.id === sourceId
              ? {
                  ...s,
                  status: 'PROCESSING' as ProcessingStatus,
                  processingStep: 'Starting...',
                  processingProgress: 0,
                }
              : s
          )
        );
        onSourceUpdated?.();
      } else {
        const data = await res.json();
        console.error('Failed to retry:', data.error);
      }
    } catch (error) {
      console.error('Failed to retry source:', error);
    } finally {
      setRetryingSourceId(null);
    }
  };

  const handleCancel = async (sourceId: string) => {
    setCancellingSourceId(sourceId);
    try {
      const res = await fetch(`/api/projects/${projectId}/sources/${sourceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cancel: true }),
      });

      if (res.ok) {
        // Update local state to show FAILED status
        setSources((prev) =>
          prev.map((s) =>
            s.id === sourceId
              ? {
                  ...s,
                  status: 'FAILED' as ProcessingStatus,
                  processingStep: null,
                  processingProgress: null,
                }
              : s
          )
        );
        onSourceUpdated?.();
      } else {
        const data = await res.json();
        console.error('Failed to cancel:', data.error);
      }
    } catch (error) {
      console.error('Failed to cancel source:', error);
    } finally {
      setCancellingSourceId(null);
    }
  };

  if (sources.length === 0) {
    return (
      <EmptyState
        icon={
          <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"
            />
          </svg>
        }
        title="No sources yet"
        description="Upload video or audio files to get started with your research."
      />
    );
  }

  if (filteredSources.length === 0) {
    return (
      <EmptyState
        icon={
          <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        }
        title="No matching sources"
        description="Try adjusting your search or filters."
      />
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
            {source.duration !== null && <> &middot; {formatTimeWithOptions(source.duration)}</>}
          </p>
          {/* Tags */}
          {source.tags && source.tags.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {source.tags.slice(0, 3).map((tag) => (
                <TagBadge key={tag.id} name={tag.name} color={tag.color} />
              ))}
              {source.tags.length > 3 && (
                <Badge variant="secondary" className="text-xs">
                  +{source.tags.length - 3}
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Status Badge */}
        <div className="flex-shrink-0">
          <SourceStatusBadge
            status={source.status}
            processingStep={source.processingStep}
            processingProgress={source.processingProgress}
            processingStartedAt={source.processingStartedAt}
            duration={source.duration}
            onRetry={source.status === 'FAILED' ? () => handleRetry(source.id) : undefined}
            isRetrying={retryingSourceId === source.id}
            onCancel={
              source.status === 'PROCESSING' || source.status === 'UPLOADING'
                ? () => handleCancel(source.id)
                : undefined
            }
            isCancelling={cancellingSourceId === source.id}
          />
        </div>

        {/* Actions Menu */}
        <div className="flex-shrink-0">
          <SourceActionsMenu
            onEdit={() => setEditingSource(source)}
            onTrash={() => setTrashingSource(source)}
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

  return (
    <>
      <div className="space-y-3">{filteredSources.map(renderSourceCard)}</div>

      {/* Edit Dialog */}
      {editingSource && (
        <SourceEditDialog
          open={!!editingSource}
          onOpenChange={(open) => !open && setEditingSource(null)}
          sourceId={editingSource.id}
          sourceTitle={editingSource.title}
          projectId={projectId}
          onSaved={(newTitle) => handleSourceUpdated(editingSource.id, newTitle)}
        />
      )}

      {/* Trash Dialog */}
      {trashingSource && (
        <SourceTrashDialog
          open={!!trashingSource}
          onOpenChange={(open) => !open && setTrashingSource(null)}
          sourceId={trashingSource.id}
          sourceTitle={trashingSource.title}
          projectId={projectId}
          onTrashed={() => handleSourceTrashed(trashingSource.id)}
        />
      )}
    </>
  );
}
