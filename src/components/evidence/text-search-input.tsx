/**
 * Text Search Input Component
 *
 * Regular text-based search input for filtering by title/content.
 * Follows Modern Smart Home Dashboard search pattern.
 */

'use client';

import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface TextSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function TextSearchInput({
  value,
  onChange,
  placeholder = 'Search sources...',
}: TextSearchInputProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-foreground text-sm font-medium">Search</h3>
      <div className="relative">
        <Search
          size={16}
          strokeWidth={1.5}
          className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2"
        />
        <Input
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
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
    </div>
  );
}
