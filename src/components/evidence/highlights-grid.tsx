/**
 * Highlights Grid Component
 *
 * Displays highlights in responsive grid or list view.
 * Follows Modern Smart Home Dashboard grid pattern.
 */

'use client';

import { HighlightResultCard } from './highlight-result-card';
import { MessageSquare } from 'lucide-react';
import { ViewMode } from './view-switcher';

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface Highlight {
  id: string;
  note: string | null;
  selectedText?: string | null;
  tag: Tag;
  segment: {
    content: string;
    startTime: number;
    endTime: number;
  };
  source: {
    id: string;
    title: string;
  };
}

interface SearchResult {
  segmentId: string;
  content: string;
  startTime: number;
  endTime: number;
  sourceId: string;
  sourceTitle: string;
  similarity: number;
  tag?: Tag; // Optional for search results
}

interface HighlightsGridProps {
  highlights?: Highlight[];
  searchResults?: SearchResult[];
  view: ViewMode;
  loading?: boolean;
  isSearchMode?: boolean;
  searchQuery?: string;
}

export function HighlightsGrid({
  highlights = [],
  searchResults = [],
  view,
  loading,
  isSearchMode,
  searchQuery,
}: HighlightsGridProps) {
  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // Search mode - display search results
  if (isSearchMode) {
    if (searchResults.length === 0) {
      return (
        <div className="border-border bg-background/50 flex flex-col items-center justify-center rounded-2xl border border-dashed p-12">
          <MessageSquare size={48} strokeWidth={1.5} className="text-muted-foreground mb-4" />
          <h3 className="text-foreground mb-2 text-lg font-semibold">No results found</h3>
          <p className="text-muted-foreground text-center text-sm">
            {searchQuery ? `No results found for "${searchQuery}"` : 'Try a different search query'}
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <h2 className="text-foreground text-lg font-semibold">
          Search Results
          <span className="text-muted-foreground ml-2 text-sm font-normal">
            {searchResults.length} match{searchResults.length !== 1 ? 'es' : ''}
          </span>
        </h2>
        <div
          className={
            view === 'grid' ? 'grid gap-4 md:grid-cols-2 lg:grid-cols-3' : 'flex flex-col gap-4'
          }
        >
          {searchResults.map((result) => (
            <HighlightResultCard
              key={result.segmentId}
              id={result.segmentId}
              content={result.content}
              startTime={result.startTime}
              endTime={result.endTime}
              sourceId={result.sourceId}
              sourceTitle={result.sourceTitle}
              tag={result.tag || { id: 'search', name: 'Search Result', color: '#8B5CF6' }}
              similarity={result.similarity}
            />
          ))}
        </div>
      </div>
    );
  }

  // Empty state - no highlights
  if (highlights.length === 0) {
    return (
      <div className="border-border bg-background/50 flex flex-col items-center justify-center rounded-2xl border border-dashed p-12">
        <MessageSquare size={48} strokeWidth={1.5} className="text-muted-foreground mb-4" />
        <h3 className="text-foreground mb-2 text-lg font-semibold">No highlights yet</h3>
        <p className="text-muted-foreground text-center text-sm">
          Start tagging segments in your sources to see them here
        </p>
      </div>
    );
  }

  // Group highlights by tag
  const highlightsByTag = highlights.reduce(
    (acc, highlight) => {
      const tagId = highlight.tag.id;
      if (!acc[tagId]) {
        acc[tagId] = {
          tag: highlight.tag,
          highlights: [],
        };
      }
      acc[tagId].highlights.push(highlight);
      return acc;
    },
    {} as Record<string, { tag: Tag; highlights: Highlight[] }>
  );

  // Normal view - display highlights grouped by tag
  return (
    <div className="space-y-8">
      {Object.values(highlightsByTag).map(({ tag, highlights: tagHighlights }) => (
        <div key={tag.id}>
          <div className="mb-4 flex items-center gap-2">
            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: tag.color }} />
            <h2 className="text-foreground text-lg font-semibold">{tag.name}</h2>
            <span className="text-muted-foreground text-sm">({tagHighlights.length})</span>
          </div>
          <div
            className={
              view === 'grid' ? 'grid gap-4 md:grid-cols-2 lg:grid-cols-3' : 'flex flex-col gap-4'
            }
          >
            {tagHighlights.map((highlight) => (
              <HighlightResultCard
                key={highlight.id}
                id={highlight.id}
                content={highlight.segment.content}
                selectedText={highlight.selectedText}
                startTime={highlight.segment.startTime}
                endTime={highlight.segment.endTime}
                sourceId={highlight.source.id}
                sourceTitle={highlight.source.title}
                tag={highlight.tag}
                note={highlight.note}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
