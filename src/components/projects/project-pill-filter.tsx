/**
 * Project Pill Filter Component
 *
 * Horizontal pill-style filter for projects (All/Active/Archived).
 * Follows Modern Smart Home Dashboard pill selector pattern.
 */

'use client';

interface ProjectPillFilterProps {
  activeFilter: 'all' | 'active' | 'archived';
  onFilterChange: (filter: 'all' | 'active' | 'archived') => void;
  counts?: {
    all: number;
    active: number;
    archived: number;
  };
}

export function ProjectPillFilter({
  activeFilter,
  onFilterChange,
  counts,
}: ProjectPillFilterProps) {
  const filters: Array<{ value: 'all' | 'active' | 'archived'; label: string }> = [
    { value: 'all', label: 'All Projects' },
    { value: 'active', label: 'Active' },
    { value: 'archived', label: 'Archived' },
  ];

  return (
    <div className="border-border bg-background inline-flex items-center gap-2 rounded-xl border p-1">
      {filters.map((filter) => (
        <button
          key={filter.value}
          onClick={() => onFilterChange(filter.value)}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 ${
            activeFilter === filter.value
              ? 'bg-accent-primary text-foreground shadow-lg'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {filter.label}
          {counts && counts[filter.value] > 0 && (
            <span
              className={`ml-2 rounded-full px-2 py-0.5 text-xs ${
                activeFilter === filter.value ? 'bg-foreground/20' : 'bg-muted'
              }`}
            >
              {counts[filter.value]}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
