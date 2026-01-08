'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Search, Filter, X, ChevronRight, Clock, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

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
  id: string;
  content: string;
  startTime: number;
  endTime: number;
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
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [isSearchMode, setIsSearchMode] = useState(false);

  // Fetch highlights
  const fetchHighlights = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedTags.length > 0) {
        params.set('tagIds', selectedTags.join(','));
      }
      if (selectedSources.length > 0) {
        params.set('sourceIds', selectedSources.join(','));
      }

      const res = await fetch(`/api/projects/${project.id}/highlights?${params}`);
      const data = await res.json();
      setHighlights(data.highlights || []);
    } catch (error) {
      console.error('Failed to fetch highlights:', error);
    } finally {
      setLoading(false);
    }
  }, [project.id, selectedTags, selectedSources]);

  // Semantic search
  const performSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      setIsSearchMode(false);
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    setIsSearchMode(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery, limit: 20, minSimilarity: 0.5 }),
      });
      const data = await res.json();
      setSearchResults(data.results || []);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setSearchLoading(false);
    }
  }, [project.id, searchQuery]);

  useEffect(() => {
    fetchHighlights();
  }, [fetchHighlights]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim()) {
        performSearch();
      } else {
        setIsSearchMode(false);
        setSearchResults([]);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, performSearch]);

  const toggleTag = (tagId: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  const toggleSource = (sourceId: string) => {
    setSelectedSources((prev) =>
      prev.includes(sourceId) ? prev.filter((id) => id !== sourceId) : [...prev, sourceId]
    );
  };

  const clearFilters = () => {
    setSelectedTags([]);
    setSelectedSources([]);
    setSearchQuery('');
    setIsSearchMode(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Group highlights by tag
  const highlightsByTag = highlights.reduce(
    (acc, h) => {
      const tagId = h.tag.id;
      if (!acc[tagId]) {
        acc[tagId] = { tag: h.tag, highlights: [] };
      }
      acc[tagId].highlights.push(h);
      return acc;
    },
    {} as Record<string, { tag: Tag; highlights: Highlight[] }>
  );

  const hasActiveFilters = selectedTags.length > 0 || selectedSources.length > 0;

  return (
    <div className="bg-background min-h-screen">
      {/* Header */}
      <header className="bg-card border-b">
        <div className="mx-auto max-w-7xl px-4 py-4">
          {/* Breadcrumb */}
          <nav className="text-muted-foreground mb-2 flex items-center gap-2 text-sm">
            <Link href="/" className="hover:text-foreground">
              {project.workspace.name}
            </Link>
            <ChevronRight className="h-4 w-4" />
            <Link href={`/projects/${project.id}`} className="hover:text-foreground">
              {project.name}
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-foreground">Evidence</span>
          </nav>

          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold">Evidence Dashboard</h1>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-sm">
                {highlights.length} highlight{highlights.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Search and Filters */}
      <div className="bg-card/50 border-b">
        <div className="mx-auto max-w-7xl px-4 py-4">
          <div className="flex items-center gap-4">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
              <Input
                placeholder="Search by meaning (semantic search)..."
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

            {/* Filter Toggle */}
            <Button
              variant={showFilters ? 'secondary' : 'outline'}
              onClick={() => setShowFilters(!showFilters)}
              className="gap-2"
            >
              <Filter className="h-4 w-4" />
              Filters
              {hasActiveFilters && (
                <Badge variant="secondary" className="ml-1">
                  {selectedTags.length + selectedSources.length}
                </Badge>
              )}
            </Button>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear all
              </Button>
            )}
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {/* Tag Filters */}
              <div>
                <h3 className="text-muted-foreground mb-2 text-sm font-medium">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {project.tags.map((tag) => (
                    <button
                      key={tag.id}
                      onClick={() => toggleTag(tag.id)}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm transition-colors ${
                        selectedTags.includes(tag.id)
                          ? 'ring-ring bg-opacity-100 ring-2'
                          : 'bg-opacity-20 hover:bg-opacity-30'
                      }`}
                      style={{
                        backgroundColor: selectedTags.includes(tag.id)
                          ? tag.color
                          : `${tag.color}33`,
                        color: selectedTags.includes(tag.id) ? '#fff' : tag.color,
                      }}
                    >
                      {tag.name}
                    </button>
                  ))}
                  {project.tags.length === 0 && (
                    <span className="text-muted-foreground text-sm">No tags created yet</span>
                  )}
                </div>
              </div>

              {/* Source Filters */}
              <div>
                <h3 className="text-muted-foreground mb-2 text-sm font-medium">Sources</h3>
                <div className="flex flex-wrap gap-2">
                  {project.sources.map((source) => (
                    <button
                      key={source.id}
                      onClick={() => toggleSource(source.id)}
                      className={`rounded-full px-3 py-1 text-sm transition-colors ${
                        selectedSources.includes(source.id)
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                      }`}
                    >
                      {source.title}
                    </button>
                  ))}
                  {project.sources.length === 0 && (
                    <span className="text-muted-foreground text-sm">No sources uploaded yet</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <main className="mx-auto max-w-7xl px-4 py-6">
        {loading || searchLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-muted-foreground">Loading...</div>
          </div>
        ) : isSearchMode ? (
          /* Search Results */
          <div>
            <h2 className="mb-4 text-lg font-medium">
              Search Results
              <span className="text-muted-foreground ml-2 text-sm font-normal">
                {searchResults.length} match{searchResults.length !== 1 ? 'es' : ''}
              </span>
            </h2>
            {searchResults.length === 0 ? (
              <div className="text-muted-foreground py-12 text-center">
                No results found for &quot;{searchQuery}&quot;
              </div>
            ) : (
              <div className="space-y-3">
                {searchResults.map((result) => (
                  <Link key={result.id} href={`/sources/${result.sourceId}?t=${result.startTime}`}>
                    <Card className="hover:border-primary/50 cursor-pointer transition-colors">
                      <CardContent className="p-4">
                        <div className="mb-2 flex items-start justify-between">
                          <span className="text-muted-foreground text-sm">
                            {result.sourceTitle}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {Math.round(result.similarity * 100)}% match
                          </Badge>
                        </div>
                        <p className="text-foreground">{result.content}</p>
                        <div className="text-muted-foreground mt-2 flex items-center gap-1 text-xs">
                          <Clock className="h-3 w-3" />
                          {formatTime(result.startTime)}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>
        ) : highlights.length === 0 ? (
          /* Empty State */
          <div className="py-12 text-center">
            <MessageSquare className="text-muted-foreground mx-auto h-12 w-12" />
            <h2 className="mt-4 text-lg font-medium">No highlights yet</h2>
            <p className="text-muted-foreground mt-2">
              Start tagging segments in your sources to see them here.
            </p>
          </div>
        ) : (
          /* Highlights grouped by tag */
          <div className="space-y-8">
            {Object.values(highlightsByTag).map(({ tag, highlights: tagHighlights }) => (
              <div key={tag.id}>
                <div className="mb-4 flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: tag.color }} />
                  <h2 className="text-lg font-medium">{tag.name}</h2>
                  <span className="text-muted-foreground text-sm">({tagHighlights.length})</span>
                </div>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {tagHighlights.map((highlight) => (
                    <Link
                      key={highlight.id}
                      href={`/sources/${highlight.source.id}?t=${highlight.segment.startTime}`}
                    >
                      <Card className="hover:border-primary/50 h-full cursor-pointer transition-colors">
                        <CardContent className="p-4">
                          <div className="text-muted-foreground mb-2 text-sm">
                            {highlight.source.title}
                          </div>
                          <p className="text-foreground line-clamp-3">
                            {highlight.segment.content}
                          </p>
                          <div className="text-muted-foreground mt-3 flex items-center gap-1 text-xs">
                            <Clock className="h-3 w-3" />
                            {formatTime(highlight.segment.startTime)} -{' '}
                            {formatTime(highlight.segment.endTime)}
                          </div>
                          {highlight.note && (
                            <div className="bg-muted/50 mt-2 rounded p-2 text-sm">
                              {highlight.note}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
