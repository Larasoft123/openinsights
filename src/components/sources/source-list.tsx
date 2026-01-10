'use client';

import { useState, useEffect } from 'react';
import { EmptyState } from '@/components/ui/empty-state';
import { SourceDeviceCard } from './source-device-card';
import { SourceEditDialog } from './source-edit-dialog';
import { SourceTrashDialog } from './source-trash-dialog';
import { SourceUploadCard } from './source-upload-card';

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
  segmentsCount?: number;
}

interface SourceListProps {
  projectId: string;
  initialSources: Source[];
  searchQuery?: string;
  selectedTags?: string[];
  onSourceUpdated?: () => void;
  onFileSelect?: (file: File) => void;
  onCancelUpload?: (sourceId: string) => void;
}

export function SourceList({
  projectId,
  initialSources,
  searchQuery = '',
  selectedTags = [],
  onSourceUpdated,
  onFileSelect,
  onCancelUpload,
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
    const source = sources.find((s) => s.id === sourceId);

    // If source is UPLOADING, use the special cancel upload handler
    if (source?.status === 'UPLOADING' && onCancelUpload) {
      onCancelUpload(sourceId);
      return;
    }

    // For PROCESSING sources, call the API
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

  return (
    <>
      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
        {/* Upload Card */}
        {onFileSelect && <SourceUploadCard onFileSelect={onFileSelect} />}

        {/* Source Cards */}
        {filteredSources.map((source) => (
          <SourceDeviceCard
            key={source.id}
            id={source.id}
            title={source.title}
            thumbnailUrl={null}
            duration={source.duration}
            segmentsCount={source.segmentsCount || 0}
            status={source.status}
            createdAt={new Date(source.createdAt)}
            tags={source.tags}
            onEdit={() => setEditingSource(source)}
            onTrash={() => setTrashingSource(source)}
            onRetry={source.status === 'FAILED' ? () => handleRetry(source.id) : undefined}
            onCancel={
              source.status === 'PROCESSING' || source.status === 'UPLOADING'
                ? () => handleCancel(source.id)
                : undefined
            }
            processingStep={source.processingStep}
            processingProgress={source.processingProgress}
            processingStartedAt={source.processingStartedAt}
            isRetrying={retryingSourceId === source.id}
            isCancelling={cancellingSourceId === source.id}
          />
        ))}
      </div>

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
