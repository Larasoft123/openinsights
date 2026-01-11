/**
 * Evidence Dashboard Component
 *
 * Two-column layout with search sidebar and highlights grid.
 * Follows Modern Smart Home Dashboard pattern.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { SearchSidebar } from './search-sidebar';
import { SemanticSearchInput } from './semantic-search-input';
import { ViewSwitcher, ViewMode } from './view-switcher';
import { HighlightsGrid } from './highlights-grid';

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface Source {
  id: string;
  title: string;
}

interface Project {
  id: string;
  name: string;
  workspace: {
    id: string;
    name: string;
    slug: string;
  };
  sources: Source[];
  tags: Tag[];
}

interface Highlight {
  id: string;
  note: string | null;
  selectedText?: string | null;
  createdAt: string;
  tag: Tag;
  segment: {
    id: string;
    content: string;
    startTime: number;
    endTime: number;
    speakerId: string | null;
  };
  source: {
    id: string;
    title: string;
    fileUrl: string | null;
  };
}

interface SearchResult {
  segmentId: string;
  content: string;
  startTime: number;
  endTime: number;
  speakerId: string | null;
  sourceId: string;
  sourceTitle: string;
  similarity: number;
}

interface EvidenceDashboardProps {
  project: Project;
}

export function EvidenceDashboard({ project }: EvidenceDashboardProps) {
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [view, setView] = useState<ViewMode>('grid');
  const [isSearchMode, setIsSearchMode] = useState(false);

  // Fetch highlights
  const fetchHighlights = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedTags.length > 0) {
        params.set('tagIds', selectedTags.join(','));
      }

      const res = await fetch(`/api/projects/${project.id}/highlights?${params}`);
      const data = await res.json();
      setHighlights(data.highlights || []);
    } catch (error) {
      console.error('Failed to fetch highlights:', error);
    } finally {
      setLoading(false);
    }
  }, [project.id, selectedTags]);

  // Fetch highlights on mount and when filters change
  useEffect(() => {
    if (!isSearchMode) {
      fetchHighlights();
    }
  }, [fetchHighlights, isSearchMode]);

  // Semantic search
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      setIsSearchMode(false);
      return;
    }

    setSearchLoading(true);
    setIsSearchMode(true);

    try {
      const res = await fetch(`/api/projects/${project.id}/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery }),
      });

      const data = await res.json();
      setSearchResults(data.results || []);
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, [searchQuery, project.id]);

  // Toggle tag filter
  const toggleTag = (tagId: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  // Clear all filters
  const clearFilters = () => {
    setSelectedTags([]);
    setSearchQuery('');
    setIsSearchMode(false);
  };

  const hasActiveFilters = selectedTags.length > 0 || searchQuery.trim().length > 0;

  return (
    <div className="flex flex-col gap-8 xl:grid xl:grid-cols-12 xl:gap-8">
      {/* Left Sidebar - Search & Filters (Sticky) */}
      <div className="xl:col-span-3">
        <div className="border-border bg-background sticky top-8 rounded-2xl border p-6">
          <SearchSidebar
            searchInput={
              <SemanticSearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                onSearch={handleSearch}
                loading={searchLoading}
              />
            }
            tags={project.tags}
            selectedTags={selectedTags}
            onToggleTag={toggleTag}
            onClearFilters={clearFilters}
            hasActiveFilters={hasActiveFilters}
          />
        </div>
      </div>

      {/* Right Main Area - Results */}
      <div className="space-y-6 xl:col-span-9">
        {/* View Switcher */}
        <div className="flex items-center justify-end">
          <ViewSwitcher view={view} onViewChange={setView} />
        </div>

        {/* Highlights Grid */}
        <HighlightsGrid
          highlights={highlights}
          searchResults={searchResults}
          view={view}
          loading={loading || searchLoading}
          isSearchMode={isSearchMode}
          searchQuery={searchQuery}
        />
      </div>
    </div>
  );
}
