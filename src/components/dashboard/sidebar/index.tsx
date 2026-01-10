/**
 * Sidebar Navigation Component
 *
 * Collapsed icon-based sidebar navigation inspired by Modern Smart Home Dashboard.
 * Features:
 * - Fixed left sidebar (64px wide on mobile, 80px on desktop)
 * - Icon-only navigation with tooltips
 * - Active state highlighting
 * - User profile at bottom
 */

'use client';

import { LayoutDashboard, FolderOpen, Lightbulb, Target, Settings, User } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { SidebarNavItem } from './nav-item';

export function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      href: '/dashboard',
      isActive: pathname === '/dashboard',
    },
    {
      id: 'projects',
      label: 'Projects',
      icon: FolderOpen,
      href: '/projects',
      isActive: pathname.startsWith('/projects'),
    },
    {
      id: 'evidence',
      label: 'Evidence',
      icon: Lightbulb,
      href: pathname.includes('/evidence') ? pathname : '/projects',
      isActive: pathname.includes('/evidence'),
    },
    {
      id: 'insights',
      label: 'Insights',
      icon: Target,
      href: pathname.includes('/insights') ? pathname : '/projects',
      isActive: pathname.includes('/insights'),
    },
  ];

  const bottomItems = [
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      href: '/settings',
      isActive: pathname === '/settings',
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: User,
      href: '#',
      isActive: false,
    },
  ];

  return (
    <nav className="bg-surface-1 border-border-subtle fixed top-0 left-0 z-50 flex h-screen w-16 flex-col items-center border-r py-6 sm:w-20 sm:py-8">
      {/* Logo */}
      <div className="mb-8 sm:mb-12">
        <div className="bg-accent-primary flex h-10 w-10 items-center justify-center rounded-xl text-lg font-bold text-white sm:h-12 sm:w-12 sm:text-xl">
          OI
        </div>
      </div>

      {/* Main Navigation */}
      <div className="flex w-full flex-1 flex-col gap-2 px-2 sm:px-3">
        {navItems.map((item) => (
          <SidebarNavItem key={item.id} {...item} />
        ))}
      </div>

      {/* Bottom Navigation */}
      <div className="mt-auto flex w-full flex-col gap-2 px-2 sm:px-3">
        {bottomItems.map((item) => (
          <SidebarNavItem key={item.id} {...item} />
        ))}
      </div>
    </nav>
  );
}
