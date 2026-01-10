'use client';

import { useState, useCallback } from 'react';
import { Search, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SourceList } from './source-list';
import { SourceUploadDialog } from './source-upload-dialog';
import { TrashView } from './trash-view';

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

interface SourcesSectionProps {
  projectId: string;
  initialSources: Source[];
  initialTrashedCount?: number;
  projectTags?: Tag[];
}

export function SourcesSection({
  projectId,
  initialSources,
  initialTrashedCount = 0,
  projectTags = [],
}: SourcesSectionProps) {
  const [sources, setSources] = useState<Source[]>(initialSources);
  const [trashedCount, setTrashedCount] = useState(initialTrashedCount);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [trashOpen, setTrashOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Get all unique tags from sources
  const allTags = projectTags.length > 0 ? projectTags : getAllTagsFromSources(sources);

  const handleUploaded = (newSource: {
    id: string;
    title: string;
    fileName: string;
    fileType: string;
    status: string;
    createdAt: string;
  }) => {
    // Add the new source to the beginning of the list
    const sourceWithDefaults: Source = {
      ...newSource,
      status: newSource.status as ProcessingStatus,
      duration: null,
      updatedAt: newSource.createdAt,
      processingStep: null,
      processingProgress: null,
      processingStartedAt: null,
      tags: [],
      highlightCount: 0,
    };
    setSources((prev) => [sourceWithDefaults, ...prev]);
  };

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

  const toggleTag = (tagId: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedTags([]);
  };

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setSelectedFile(null);
  };

  const hasActiveFilters = searchQuery || selectedTags.length > 0;

  return (
    <div>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Sources</h2>
        {trashedCount > 0 && (
          <Button variant="outline" size="sm" onClick={() => setTrashOpen(true)}>
            <Trash2 className="mr-2 h-4 w-4" />
            Trash ({trashedCount})
          </Button>
        )}
      </div>

      {/* Search and Filters */}
      {(sources.length > 0 || hasActiveFilters) && (
        <div className="mb-4 space-y-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <Input
              placeholder="Search sources..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Tag Filters */}
          {allTags.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-muted-foreground text-sm">Filter by tags:</span>
              {allTags.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => toggleTag(tag.id)}
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
                    selectedTags.includes(tag.id)
                      ? 'ring-ring ring-2 ring-offset-1'
                      : 'hover:opacity-80'
                  }`}
                  style={{
                    backgroundColor: selectedTags.includes(tag.id) ? tag.color : `${tag.color}20`,
                    color: selectedTags.includes(tag.id) ? '#fff' : tag.color,
                  }}
                >
                  {tag.name}
                </button>
              ))}
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-muted-foreground hover:text-foreground ml-2 text-xs underline"
                >
                  Clear filters
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Source Grid */}
      <SourceList
        projectId={projectId}
        initialSources={sources}
        searchQuery={searchQuery}
        selectedTags={selectedTags}
        onSourceUpdated={refreshSources}
        onFileSelect={handleFileSelect}
      />

      {/* Upload Dialog */}
      <SourceUploadDialog
        projectId={projectId}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onUploaded={handleUploaded}
        initialFile={selectedFile}
      />

      {/* Trash View */}
      <TrashView
        open={trashOpen}
        onOpenChange={setTrashOpen}
        projectId={projectId}
        onSourceRestored={refreshSources}
      />
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
