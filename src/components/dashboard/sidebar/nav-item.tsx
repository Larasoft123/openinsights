/**
 * Sidebar Navigation Item Component
 *
 * Icon-based navigation item with hover tooltip.
 * Follows Modern Smart Home Dashboard pattern.
 */

'use client';

import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface SidebarNavItemProps {
  id: string;
  label: string;
  icon: LucideIcon;
  href: string;
  isActive: boolean;
}

export function SidebarNavItem({ label, icon: Icon, href, isActive }: SidebarNavItemProps) {
  return (
    <Link
      href={href}
      className={cn(
        'group relative flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-200 sm:h-12 sm:w-12',
        isActive
          ? 'bg-accent-primary text-white shadow-lg'
          : 'text-text-secondary hover:text-text-primary hover:bg-surface-2'
      )}
    >
      <Icon size={isActive ? 20 : 18} className="flex-shrink-0" />

      {/* Tooltip */}
      <div className="bg-surface-2 border-border-subtle text-text-primary pointer-events-none invisible absolute left-14 z-50 rounded-lg border px-3 py-2 text-sm whitespace-nowrap opacity-0 shadow-lg transition-all duration-200 group-hover:visible group-hover:opacity-100 sm:left-16">
        {label}
        {/* Arrow */}
        <div className="border-r-surface-2 absolute top-1/2 right-full -translate-y-1/2 border-4 border-transparent" />
      </div>
    </Link>
  );
}
