/**
 * PillNavigation Component
 *
 * Interactive pill-style navigation/filters.
 * Pattern from both Sprint Linear Clone and Smart Home Dashboard (RoomSelector).
 *
 * Use cases:
 * - View switchers (Grid/List/Board)
 * - Filter toggles
 * - Tab navigation
 * - Project/context switching
 */

'use client';

import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

export interface PillItem {
  id: string;
  label: string;
  icon?: LucideIcon;
}

interface PillNavigationProps<T extends PillItem> {
  /** Array of pill items */
  items: T[];
  /** Currently selected item ID */
  selectedId: string;
  /** Selection change handler */
  onSelectionChange: (id: string) => void;
  /** Additional CSS classes */
  className?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Show icons only on mobile */
  iconsOnlyMobile?: boolean;
}

const sizeClasses = {
  sm: 'h-8 px-2.5 text-xs',
  md: 'h-9 px-3.5 text-sm',
  lg: 'h-10 px-4 text-base',
};

export function PillNavigation<T extends PillItem>({
  items,
  selectedId,
  onSelectionChange,
  className,
  size = 'md',
  iconsOnlyMobile = true,
}: PillNavigationProps<T>) {
  return (
    <div className={cn('scrollbar-hide flex gap-1.5 overflow-x-auto', className)}>
      {items.map((item) => {
        const Icon = item.icon;
        const isSelected = item.id === selectedId;

        return (
          <button
            key={item.id}
            onClick={() => onSelectionChange(item.id)}
            className={cn(
              'flex flex-shrink-0 items-center gap-2 rounded-full font-medium transition-all duration-200',
              sizeClasses[size],
              isSelected
                ? 'bg-foreground text-surface-1 dark:bg-foreground dark:text-surface-1'
                : 'bg-surface-2 text-text-secondary hover:bg-surface-3 hover:text-text-primary'
            )}
          >
            {Icon && <Icon className="size-4 flex-shrink-0" />}
            <span className={cn(iconsOnlyMobile && Icon && 'hidden sm:inline')}>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * Single Pill Button (standalone use)
 */
interface PillButtonProps {
  children: React.ReactNode;
  selected?: boolean;
  onClick?: () => void;
  icon?: LucideIcon;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function PillButton({
  children,
  selected = false,
  onClick,
  icon: Icon,
  className,
  size = 'md',
}: PillButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-shrink-0 items-center gap-2 rounded-full font-medium transition-all duration-200',
        sizeClasses[size],
        selected
          ? 'bg-foreground text-surface-1 dark:bg-foreground dark:text-surface-1'
          : 'bg-surface-2 text-text-secondary hover:bg-surface-3 hover:text-text-primary',
        className
      )}
    >
      {Icon && <Icon className="size-4 flex-shrink-0" />}
      <span>{children}</span>
    </button>
  );
}
