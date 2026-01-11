'use client';

import { LayoutDashboard, FolderOpen, Lightbulb, Target, Settings, Bug } from 'lucide-react';
import Image from 'next/image';

interface MockSidebarProps {
  activePage: string;
  onNavigate: (page: string) => void;
}

export function MockSidebar({ activePage, onNavigate }: MockSidebarProps) {
  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      id: 'projects',
      label: 'Projects',
      icon: FolderOpen,
    },
    {
      id: 'evidence',
      label: 'Evidence',
      icon: Lightbulb,
    },
    {
      id: 'insights',
      label: 'Insights',
      icon: Target,
    },
  ];

  const bottomItems = [
    {
      id: 'bug-report',
      label: 'Bug Report',
      icon: Bug,
      isExternal: true,
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
    },
  ];

  return (
    <nav className="bg-background fixed top-0 left-0 z-50 flex h-screen w-20 flex-col items-center py-6">
      {/* Logo */}
      <div className="mb-10">
        <Image
          src="/nin-logo-symbol.png"
          alt="NIN Logo"
          width={48}
          height={48}
          className="shrink-0 dark:invert"
        />
      </div>

      {/* Main Navigation */}
      <div className="flex w-full flex-1 flex-col gap-3 px-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`group relative flex h-12 w-full items-center justify-center rounded-xl transition-colors ${
                isActive
                  ? 'bg-blue-500/10 text-blue-400'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <Icon size={20} strokeWidth={1.5} />

              {/* Tooltip */}
              <div className="bg-muted text-foreground pointer-events-none absolute left-full ml-2 hidden rounded-lg px-3 py-2 text-sm whitespace-nowrap opacity-0 transition-opacity group-hover:opacity-100 xl:block">
                {item.label}
              </div>
            </button>
          );
        })}
      </div>

      {/* Bottom Navigation */}
      <div className="mt-auto flex w-full flex-col gap-3 px-3">
        {bottomItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;

          return (
            <button
              key={item.id}
              onClick={() => !item.isExternal && onNavigate(item.id)}
              className={`group relative flex h-12 w-full items-center justify-center rounded-xl transition-colors ${
                isActive
                  ? 'bg-blue-500/10 text-blue-400'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <Icon size={20} strokeWidth={1.5} />

              {/* Tooltip */}
              <div className="bg-muted text-foreground pointer-events-none absolute left-full ml-2 hidden rounded-lg px-3 py-2 text-sm whitespace-nowrap opacity-0 transition-opacity group-hover:opacity-100 xl:block">
                {item.label}
              </div>
            </button>
          );
        })}

        {/* User Profile */}
        <div className="border-border bg-muted/50 mt-6 flex h-14 w-full items-center justify-center rounded-xl border">
          <div className="text-foreground flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-sm font-semibold">
            DM
          </div>
        </div>
      </div>
    </nav>
  );
}
