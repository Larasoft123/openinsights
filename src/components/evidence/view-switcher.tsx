/**
 * View Switcher Component
 *
 * Pill navigation for switching between Grid/List/Timeline views.
 * Follows Modern Smart Home Dashboard pill selector pattern.
 */

'use client';

import { LayoutGrid, List } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ViewMode = 'grid' | 'list';

interface ViewSwitcherProps {
  view: ViewMode;
  onViewChange: (view: ViewMode) => void;
}

export function ViewSwitcher({ view, onViewChange }: ViewSwitcherProps) {
  const views = [
    {
      id: 'grid' as ViewMode,
      label: 'Grid',
      icon: LayoutGrid,
    },
    {
      id: 'list' as ViewMode,
      label: 'List',
      icon: List,
    },
  ];

  return (
    <div className="flex items-center gap-2">
      {views.map((viewOption) => (
        <button
          key={viewOption.id}
          onClick={() => onViewChange(viewOption.id)}
          className={cn(
            'flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200',
            view === viewOption.id
              ? 'bg-accent-primary text-white shadow-lg'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
          )}
        >
          <viewOption.icon size={16} strokeWidth={1.5} />
          <span>{viewOption.label}</span>
        </button>
      ))}
    </div>
  );
}
