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
  const isExternal = href.startsWith('http');

  const className = cn(
    'group relative flex h-14 w-14 items-center justify-center rounded-2xl transition-all duration-200',
    isActive
      ? 'bg-accent-primary text-white shadow-lg'
      : 'text-gray-400 hover:scale-110 hover:bg-gray-800 hover:text-white'
  );

  const content = (
    <>
      <Icon size={24} strokeWidth={1.5} className="flex-shrink-0" />

      {/* Tooltip */}
      <div className="pointer-events-none invisible absolute left-20 z-50 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm whitespace-nowrap text-white opacity-0 shadow-lg transition-all duration-200 group-hover:visible group-hover:opacity-100">
        {label}
        {/* Arrow */}
        <div className="absolute top-1/2 right-full -translate-y-1/2 border-4 border-transparent border-r-gray-800" />
      </div>
    </>
  );

  if (isExternal) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {content}
      </a>
    );
  }

  return (
    <Link href={href} className={className}>
      {content}
    </Link>
  );
}
