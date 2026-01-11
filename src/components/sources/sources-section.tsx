'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SearchSidebar } from '@/components/evidence/search-sidebar';
import { TextSearchInput } from '@/components/evidence/text-search-input';
import { ViewSwitcher, ViewMode } from '@/components/evidence/view-switcher';
import { SourceList } from './source-list';
import { TrashView } from './trash-view';
import { useShareContext } from '@/lib/contexts/read-only-context';

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

interface SourcesSectionProps {
  projectId: string;
  initialSources: Source[];
  initialTrashedCount?: number;
  projectTags?: Tag[];
}

const ACCEPTED_FILE_TYPES = [
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'audio/mp3',
  'audio/wav',
  'audio/mpeg',
  'audio/m4a',
];

const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024; // 2GB

export function SourcesSection({
  projectId,
  initialSources,
  initialTrashedCount = 0,
  projectTags = [],
}: SourcesSectionProps) {
  const { canEdit } = useShareContext();
  const [sources, setSources] = useState<Source[]>(initialSources);
  const [trashedCount, setTrashedCount] = useState(initialTrashedCount);
  const [trashOpen, setTrashOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [view, setView] = useState<ViewMode>('grid');
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const uploadXhrMap = useRef<Map<string, XMLHttpRequest>>(new Map());

  // Get all unique tags from sources
  const allTags = projectTags.length > 0 ? projectTags : getAllTagsFromSources(sources);

  const refreshSources = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/sources`);
      if (res.ok) {
        const data = await res.json();
        setSources(data.sources);
        setTrashedCount(data.trashedCount || 0);
      }
    } catch (error) {
      console.error('Failed to refresh sources:', error);
    }
  }, [projectId]);

  const handleFileUpload = useCallback(
    async (file: File) => {
      setUploadError(null);

      // Validate file
      if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
        setUploadError(`Invalid file type. Accepted: MP4, WebM, QuickTime, MP3, WAV, M4A`);
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        setUploadError(`File too large. Maximum size is 2GB.`);
        return;
      }

      try {
        // Step 1: Create source and get presigned URL
        const createRes = await fetch(`/api/projects/${projectId}/sources`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
          }),
        });

        if (!createRes.ok) {
          const data = await createRes.json();
          throw new Error(data.error || 'Failed to create source');
        }

        const { source, uploadUrl } = await createRes.json();

        // Add source to list immediately with UPLOADING status
        const newSource: Source = {
          id: source.id,
          title: source.title,
          fileName: source.fileName,
          fileType: source.fileType,
          status: 'UPLOADING' as ProcessingStatus,
          duration: null,
          createdAt: source.createdAt,
          updatedAt: source.createdAt,
          processingStep: 'Uploading...',
          processingProgress: 0,
          processingStartedAt: new Date().toISOString(),
          tags: [],
          highlightCount: 0,
        };
        setSources((prev) => [newSource, ...prev]);

        // Step 2: Upload directly to S3 with progress tracking
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          uploadXhrMap.current.set(source.id, xhr);

          xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
              const progress = Math.round((e.loaded / e.total) * 100);
              setSources((prev) =>
                prev.map((s) =>
                  s.id === source.id
                    ? {
                        ...s,
                        processingProgress: progress,
                        processingStep: `Uploading... ${progress}%`,
                      }
                    : s
                )
              );
            }
          });

          xhr.addEventListener('load', () => {
            uploadXhrMap.current.delete(source.id);
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve();
            } else {
              reject(new Error(`Upload failed with status ${xhr.status}`));
            }
          });

          xhr.addEventListener('error', () => {
            uploadXhrMap.current.delete(source.id);
            reject(new Error('Network error during upload'));
          });

          xhr.addEventListener('abort', () => {
            uploadXhrMap.current.delete(source.id);
            reject(new Error('Upload cancelled'));
          });

          xhr.open('PUT', uploadUrl);
          xhr.setRequestHeader('Content-Type', file.type);
          xhr.send(file);
        });

        // Step 3: Confirm upload and start processing
        const completeRes = await fetch(
          `/api/projects/${projectId}/sources/${source.id}/complete`,
          {
            method: 'POST',
          }
        );

        if (!completeRes.ok) {
          const data = await completeRes.json();
          throw new Error(data.error || 'Failed to start processing');
        }

        // Update source to PROCESSING status
        setSources((prev) =>
          prev.map((s) =>
            s.id === source.id
              ? {
                  ...s,
                  status: 'PROCESSING',
                  processingStep: 'Processing...',
                  processingProgress: 0,
                }
              : s
          )
        );
      } catch (err) {
        if (err instanceof Error && err.message === 'Upload cancelled') {
          return;
        }
        setUploadError(err instanceof Error ? err.message : 'Upload failed');
        // Remove failed source or mark as failed
        setSources((prev) => prev.filter((s) => s.status !== 'UPLOADING'));
      }
    },
    [projectId]
  );

  const toggleTag = (tagId: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedTags([]);
  };

  // Drag and drop handlers for entire section (only in edit mode)
  const handleDragOver = (e: React.DragEvent) => {
    if (!canEdit) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only hide overlay if leaving the main container
    if (e.currentTarget === e.target) {
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    if (!canEdit) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileUpload(droppedFile);
    }
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  // Global event listener to catch drag cancellations
  useEffect(() => {
    const handleGlobalDragEnd = () => {
      setIsDragging(false);
    };

    const handleGlobalDrop = () => {
      setIsDragging(false);
    };

    window.addEventListener('dragend', handleGlobalDragEnd);
    window.addEventListener('drop', handleGlobalDrop);

    return () => {
      window.removeEventListener('dragend', handleGlobalDragEnd);
      window.removeEventListener('drop', handleGlobalDrop);
    };
  }, []);

  const handleCancelUpload = useCallback((sourceId: string) => {
    // Abort the XHR request if it exists
    const xhr = uploadXhrMap.current.get(sourceId);
    if (xhr) {
      xhr.abort();
      uploadXhrMap.current.delete(sourceId);
    }

    // Remove the source from the list
    setSources((prev) => prev.filter((s) => s.id !== sourceId));
  }, []);

  const hasActiveFilters = Boolean(searchQuery || selectedTags.length > 0);

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onDragEnd={handleDragEnd}
      className="relative"
    >
      {/* Drag Overlay (edit mode only) */}
      {canEdit && isDragging && (
        <div
          className="fixed inset-0 z-[1001] flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setIsDragging(false)}
        >
          <div className="flex flex-col items-center gap-4">
            <div className="bg-accent-primary/20 ring-accent-primary flex h-32 w-32 items-center justify-center rounded-full ring-4 ring-offset-4 ring-offset-black">
              <Upload size={64} strokeWidth={1.5} className="text-accent-primary" />
            </div>
            <h2 className="text-2xl font-bold text-white">Drop file to upload</h2>
            <p className="text-gray-400">MP4, WebM, QuickTime, MP3, WAV, M4A (max 2GB)</p>
          </div>
        </div>
      )}

      {/* Error Message (edit mode only) */}
      {canEdit && uploadError && (
        <div className="mb-4 rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {uploadError}
          <button
            onClick={() => setUploadError(null)}
            className="ml-2 underline hover:text-red-300"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Two-Column Layout */}
      <div className="flex flex-col gap-8 xl:grid xl:grid-cols-12 xl:gap-8">
        {/* Left Sidebar - Search & Filters (Sticky) */}
        <div className="xl:col-span-3">
          <div className="sticky top-8 rounded-2xl border border-gray-800 bg-gray-900 p-6">
            <SearchSidebar
              searchInput={
                <TextSearchInput
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder="Search sources..."
                />
              }
              tags={allTags}
              selectedTags={selectedTags}
              onToggleTag={toggleTag}
              onClearFilters={clearFilters}
              hasActiveFilters={hasActiveFilters}
            />
          </div>
        </div>

        {/* Right Main Area - Source Grid */}
        <div className="xl:col-span-9">
          <div className="space-y-6">
            {/* View Switcher and Trash Button */}
            <div className="flex items-center justify-between">
              <ViewSwitcher view={view} onViewChange={setView} />
              {/* Trash button only in edit mode */}
              {canEdit && trashedCount > 0 && (
                <Button variant="outline" size="sm" onClick={() => setTrashOpen(true)}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Trash ({trashedCount})
                </Button>
              )}
            </div>

            {/* Source List */}
            <SourceList
              projectId={projectId}
              initialSources={sources}
              searchQuery={searchQuery}
              selectedTags={selectedTags}
              onSourceUpdated={canEdit ? refreshSources : undefined}
              onFileSelect={canEdit ? handleFileUpload : undefined}
              onCancelUpload={canEdit ? handleCancelUpload : undefined}
              view={view}
              readOnly={!canEdit}
            />
          </div>
        </div>
      </div>

      {/* Trash View (edit mode only) */}
      {canEdit && (
        <TrashView
          open={trashOpen}
          onOpenChange={setTrashOpen}
          projectId={projectId}
          onSourceRestored={refreshSources}
        />
      )}
    </div>
  );
}

// Helper function to extract unique tags from sources
function getAllTagsFromSources(sources: Source[]): Tag[] {
  const tagMap = new Map<string, Tag>();
  for (const source of sources) {
    if (source.tags) {
      for (const tag of source.tags) {
        if (!tagMap.has(tag.id)) {
          tagMap.set(tag.id, tag);
        }
      }
    }
  }
  return Array.from(tagMap.values());
}
