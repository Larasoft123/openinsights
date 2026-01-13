'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { User, Building2, FolderKanban, Cpu } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SettingsNavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  description: string;
  requiredRole?: 'OWNER' | 'ADMIN' | 'MEMBER';
}

const NAV_ITEMS: SettingsNavItem[] = [
  {
    label: 'Profile',
    href: '/settings/profile',
    icon: User,
    description: 'Your personal account settings',
  },
  {
    label: 'Organization',
    href: '/settings/organization',
    icon: Building2,
    description: 'Manage organization and members',
    requiredRole: 'ADMIN',
  },
  {
    label: 'Workspaces',
    href: '/settings/workspace',
    icon: FolderKanban,
    description: 'Manage workspaces and access',
  },
  {
    label: 'AI Settings',
    href: '/settings/ai',
    icon: Cpu,
    description: 'Configure AI providers and models',
  },
];

interface SettingsSidebarProps {
  currentRole: 'OWNER' | 'ADMIN' | 'MEMBER' | null;
}

const ROLE_HIERARCHY: Record<string, number> = {
  MEMBER: 0,
  ADMIN: 1,
  OWNER: 2,
};

export function SettingsSidebar({ currentRole }: SettingsSidebarProps) {
  const pathname = usePathname();

  const hasAccess = (requiredRole?: string): boolean => {
    if (!requiredRole) return true;
    if (!currentRole) return false;
    return ROLE_HIERARCHY[currentRole] >= ROLE_HIERARCHY[requiredRole];
  };

  const visibleItems = NAV_ITEMS.filter((item) => hasAccess(item.requiredRole));

  return (
    <nav className="h-full w-64 shrink-0 overflow-y-auto border-r border-gray-800 bg-gray-900/50 p-4">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-white">Settings</h2>
        <p className="text-sm text-gray-400">Manage your account and preferences</p>
      </div>

      <ul className="space-y-1">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
                  isActive
                    ? 'bg-gray-800 text-white'
                    : 'text-gray-400 hover:bg-gray-800/50 hover:text-white'
                )}
              >
                <Icon className="h-5 w-5" />
                <div className="flex flex-col">
                  <span className="font-medium">{item.label}</span>
                  <span className="text-xs text-gray-500">{item.description}</span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
