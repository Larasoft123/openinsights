/**
 * Semantic Search Input Component
 *
 * Search input with Sparkles icon for semantic/meaning-based search.
 * Follows Modern Smart Home Dashboard search pattern.
 */

'use client';

import { Sparkles, X } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface SemanticSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: () => void;
  loading?: boolean;
}

export function SemanticSearchInput({
  value,
  onChange,
  onSearch,
  loading = false,
}: SemanticSearchInputProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSearch();
    }
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-white">Semantic Search</h3>
      <div className="relative">
        <Sparkles
          size={16}
          strokeWidth={1.5}
          className="absolute top-1/2 left-3 -translate-y-1/2 text-purple-400"
        />
        <Input
          placeholder="Search by meaning..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
          className="focus:border-accent-primary focus:ring-accent-primary border-gray-700 bg-gray-800 pr-10 pl-10 text-white placeholder:text-gray-400"
        />
        {value && (
          <button
            onClick={() => onChange('')}
            className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400 transition-colors hover:text-white"
          >
            <X size={16} strokeWidth={1.5} />
          </button>
        )}
      </div>
      {loading && <p className="text-xs text-gray-400">Searching...</p>}
    </div>
  );
}
