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
    <div className="inline-flex items-center gap-2 rounded-xl border border-gray-800 bg-gray-900 p-1">
      {filters.map((filter) => (
        <button
          key={filter.value}
          onClick={() => onFilterChange(filter.value)}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 ${
            activeFilter === filter.value
              ? 'bg-accent-primary text-white shadow-lg'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          {filter.label}
          {counts && counts[filter.value] > 0 && (
            <span
              className={`ml-2 rounded-full px-2 py-0.5 text-xs ${
                activeFilter === filter.value ? 'bg-white/20' : 'bg-gray-800'
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
