/**
 * Project Pill Navigation Component
 *
 * Tab navigation for Sources/Evidence/Insights sections.
 * Follows Modern Smart Home Dashboard pill selector pattern.
 */

'use client';

import { usePathname, useRouter } from 'next/navigation';
import { FileVideo, Tag, Target } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProjectPillNavProps {
  projectId: string;
}

export function ProjectPillNav({ projectId }: ProjectPillNavProps) {
  const pathname = usePathname();
  const router = useRouter();

  const tabs = [
    {
      id: 'sources',
      label: 'Sources',
      icon: FileVideo,
      href: `/projects/${projectId}`,
      isActive: pathname === `/projects/${projectId}`,
    },
    {
      id: 'evidence',
      label: 'Evidence',
      icon: Tag,
      href: `/projects/${projectId}/evidence`,
      isActive: pathname.includes('/evidence'),
    },
    {
      id: 'insights',
      label: 'Insights',
      icon: Target,
      href: `/projects/${projectId}/insights`,
      isActive: pathname.includes('/insights'),
    },
  ];

  return (
    <div className="flex items-center gap-2">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => router.push(tab.href)}
          className={cn(
            'flex items-center gap-2 rounded-full px-6 py-3 text-sm font-medium transition-all duration-200',
            tab.isActive
              ? 'bg-accent-primary text-foreground shadow-lg'
              : 'bg-muted text-muted-foreground hover:text-foreground hover:bg-gray-700'
          )}
        >
          <tab.icon size={16} strokeWidth={1.5} />
          <span>{tab.label}</span>
        </button>
      ))}
    </div>
  );
}
