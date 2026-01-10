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
      <h3 className="text-sm font-medium text-white">Search</h3>
      <div className="relative">
        <Search
          size={16}
          strokeWidth={1.5}
          className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400"
        />
        <Input
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
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
    </div>
  );
}
