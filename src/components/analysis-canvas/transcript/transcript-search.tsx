'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useVideoPlayerStore } from '@/lib/stores/video-player-store';
import { TranscriptSegmentData } from './transcript-segment';

interface TranscriptSearchProps {
  segments: TranscriptSegmentData[];
}

// Debounce delay in milliseconds
const DEBOUNCE_DELAY = 300;

/**
 * TranscriptSearch Component
 *
 * Search input with debounced filtering for transcript segments.
 *
 * Features:
 * - Case-insensitive content search
 * - Debounced input (300ms) to avoid excessive filtering
 * - Clear button to reset search
 * - Updates store with filtered segment IDs
 */
export function TranscriptSearch({ segments }: TranscriptSearchProps) {
  const [inputValue, setInputValue] = useState('');
  const setSearchQuery = useVideoPlayerStore((state) => state.setSearchQuery);
  const setFilteredSegmentIds = useVideoPlayerStore((state) => state.setFilteredSegmentIds);

  // Debounce the search query
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(inputValue);
    }, DEBOUNCE_DELAY);

    return () => clearTimeout(timer);
  }, [inputValue]);

  // Filter segments based on debounced query
  const filteredIds = useMemo(() => {
    const query = debouncedQuery.trim().toLowerCase();

    if (!query) return null; // No filter when empty

    return segments
      .filter((segment) => segment.content.toLowerCase().includes(query))
      .map((segment) => segment.id);
  }, [segments, debouncedQuery]);

  // Update store with filtered IDs and search query
  useEffect(() => {
    setSearchQuery(debouncedQuery);
    setFilteredSegmentIds(filteredIds);
  }, [debouncedQuery, filteredIds, setSearchQuery, setFilteredSegmentIds]);

  // Clear search
  const handleClear = useCallback(() => {
    setInputValue('');
  }, []);

  // Handle input change
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  }, []);

  return (
    <div className="relative">
      <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
      <Input
        type="text"
        placeholder="Search transcript..."
        value={inputValue}
        onChange={handleChange}
        className="pr-9 pl-9"
      />
      {inputValue && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClear}
          className="absolute top-1/2 right-1 size-7 -translate-y-1/2 p-0"
        >
          <X className="size-4" />
          <span className="sr-only">Clear search</span>
        </Button>
      )}
    </div>
  );
}
