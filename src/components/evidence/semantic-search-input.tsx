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
      <h3 className="text-foreground text-sm font-medium">Semantic Search</h3>
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
          className="focus:border-accent-primary focus:ring-accent-primary border-border bg-muted text-foreground placeholder:text-muted-foreground pr-10 pl-10"
        />
        {value && (
          <button
            onClick={() => onChange('')}
            className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2 transition-colors"
          >
            <X size={16} strokeWidth={1.5} />
          </button>
        )}
      </div>
      {loading && <p className="text-muted-foreground text-xs">Searching...</p>}
    </div>
  );
}
