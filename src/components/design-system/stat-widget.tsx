/**
 * StatWidget Component
 *
 * Display metrics and statistics with optional trends.
 * Pattern from Smart Home Dashboard.
 *
 * Use cases:
 * - Dashboard metrics (projects count, sources, highlights)
 * - Processing queue status
 * - Activity stats
 */

import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

interface StatWidgetProps {
  /** Icon component */
  icon?: LucideIcon;
  /** Main label */
  label: string;
  /** Primary value to display */
  value: string | number;
  /** Optional change indicator (e.g., "+18 this week") */
  change?: string;
  /** Trend direction */
  trend?: 'up' | 'down' | 'neutral';
  /** Optional subtitle/description */
  subtitle?: string;
  /** Additional content (e.g., progress bar) */
  children?: ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Click handler */
  onClick?: () => void;
}

const trendColors = {
  up: 'bg-success/10 text-success',
  down: 'bg-error/10 text-error',
  neutral: 'bg-surface-2 text-text-secondary',
};

export function StatWidget({
  icon: Icon,
  label,
  value,
  change,
  trend = 'neutral',
  subtitle,
  children,
  className,
  onClick,
}: StatWidgetProps) {
  const isInteractive = !!onClick;

  return (
    <div
      className={cn(
        'bg-card rounded-2xl p-6 border border-border-subtle transition-all duration-200',
        isInteractive && 'cursor-pointer hover:shadow-lg hover:border-border-default',
        className
      )}
      onClick={onClick}
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
    >
      {/* Header Row: Icon and Change Badge */}
      <div className="flex items-start justify-between mb-4">
        {Icon && (
          <div className="p-2 bg-accent-primary/10 rounded-lg">
            <Icon className="size-5 text-accent-primary" />
          </div>
        )}
        {change && (
          <span
            className={cn(
              'text-xs font-medium px-2 py-1 rounded-full',
              trendColors[trend]
            )}
          >
            {change}
          </span>
        )}
      </div>

      {/* Value */}
      <div className="text-3xl font-bold mb-1">{value}</div>

      {/* Label and Subtitle */}
      <div className="text-sm text-muted-foreground">
        {label}
        {subtitle && <span className="block text-xs mt-1">{subtitle}</span>}
      </div>

      {/* Additional Content */}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}

/**
 * StatWidgetSkeleton - Loading state
 */
export function StatWidgetSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'bg-card rounded-2xl p-6 border border-border-subtle animate-pulse',
        className
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="w-9 h-9 bg-surface-2 rounded-lg" />
        <div className="w-16 h-6 bg-surface-2 rounded-full" />
      </div>
      <div className="h-9 w-20 bg-surface-2 rounded mb-1" />
      <div className="h-4 w-32 bg-surface-2 rounded" />
    </div>
  );
}
