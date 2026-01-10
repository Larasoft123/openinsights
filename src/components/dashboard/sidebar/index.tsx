/**
 * Sidebar Navigation Component
 *
 * Collapsed icon-based sidebar navigation inspired by Modern Smart Home Dashboard.
 * Features:
 * - Fixed left sidebar (80px wide)
 * - Icon-only navigation with tooltips
 * - Active state highlighting
 * - User profile at bottom (large format)
 */

'use client';

import { LayoutDashboard, FolderOpen, Lightbulb, Target, Settings, Bug } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { SidebarNavItem } from './nav-item';
import { SidebarUserProfile } from './user-profile';

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
      id: 'bug-report',
      label: 'Bug Report',
      icon: Bug,
      href: 'https://github.com/anthropics/claude-code/issues',
      isActive: false,
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      href: '/settings',
      isActive: pathname === '/settings',
    },
  ];

  return (
    <nav className="fixed top-0 left-0 z-50 flex h-screen w-20 flex-col items-center bg-gray-900 py-6">
      {/* Logo */}
      <div className="mb-10">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 text-xl font-bold text-white">
          OI
        </div>
      </div>

      {/* Main Navigation */}
      <div className="flex w-full flex-1 flex-col gap-3 px-3">
        {navItems.map((item) => (
          <SidebarNavItem key={item.id} {...item} />
        ))}
      </div>

      {/* Bottom Navigation */}
      <div className="mt-auto flex w-full flex-col gap-3 px-3">
        {bottomItems.map((item) => (
          <SidebarNavItem key={item.id} {...item} />
        ))}

        {/* User Profile */}
        <SidebarUserProfile />
      </div>
    </nav>
  );
}
