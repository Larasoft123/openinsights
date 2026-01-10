/**
 * Search Sidebar Component
 *
 * Left sticky panel with search and tag filters.
 * Follows Modern Smart Home Dashboard two-column pattern.
 * Supports both semantic and text-based search modes.
 */

'use client';

import { TagFilterPanel } from './tag-filter-panel';
import { X } from 'lucide-react';
import { ReactNode } from 'react';

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface SearchSidebarProps {
  searchInput: ReactNode;
  tags: Tag[];
  selectedTags: string[];
  onToggleTag: (tagId: string) => void;
  onClearFilters?: () => void;
  hasActiveFilters?: boolean;
}

export function SearchSidebar({
  searchInput,
  tags,
  selectedTags,
  onToggleTag,
  onClearFilters,
  hasActiveFilters,
}: SearchSidebarProps) {
  return (
    <div className="space-y-6">
      {/* Sidebar Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Search & Filter</h2>
        {hasActiveFilters && onClearFilters && (
          <button
            onClick={onClearFilters}
            className="flex items-center gap-1 text-xs text-gray-400 transition-colors hover:text-white"
          >
            <X size={14} strokeWidth={1.5} />
            Clear all
          </button>
        )}
      </div>

      {/* Search Input (Semantic or Text) */}
      {searchInput}

      {/* Divider */}
      <div className="border-t border-gray-800" />

      {/* Tag Filters */}
      <TagFilterPanel tags={tags} selectedTags={selectedTags} onToggleTag={onToggleTag} />
    </div>
  );
}
