/**
 * Project Pill Navigation Component
 *
 * Tab navigation for Sources/Evidence/Insights sections.
 * Follows Modern Smart Home Dashboard pill selector pattern.
 * Supports dynamic basePath for shared views.
 */

'use client';

import { usePathname, useRouter } from 'next/navigation';
import { FileVideo, Tag, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useShareContext } from '@/lib/contexts/read-only-context';

interface ProjectPillNavProps {
  projectId: string;
}

export function ProjectPillNav({ projectId }: ProjectPillNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { basePath, canEdit, includeEvidence, includeInsights } = useShareContext();

  // Use basePath from context for shared views, otherwise use standard project path
  const navBasePath = basePath || `/projects/${projectId}`;

  // Define all possible tabs
  const allTabs = [
    {
      id: 'sources',
      label: 'Sources',
      icon: FileVideo,
      href: navBasePath,
      isActive: pathname === navBasePath || pathname.endsWith('/sources'),
      alwaysShow: true,
    },
    {
      id: 'evidence',
      label: 'Evidence',
      icon: Tag,
      href: `${navBasePath}/evidence`,
      isActive: pathname.includes('/evidence'),
      alwaysShow: canEdit || includeEvidence,
    },
    {
      id: 'insights',
      label: 'Insights',
      icon: Target,
      href: `${navBasePath}/insights`,
      isActive: pathname.includes('/insights'),
      alwaysShow: canEdit || includeInsights,
    },
  ];

  // Filter tabs based on share settings
  const tabs = allTabs.filter((tab) => tab.alwaysShow);

  return (
    <div className="flex items-center gap-2">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => router.push(tab.href)}
          className={cn(
            'flex items-center gap-2 rounded-full px-6 py-3 text-sm font-medium transition-all duration-200',
            tab.isActive
              ? 'bg-accent-primary text-white shadow-lg'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
          )}
        >
          <tab.icon size={16} strokeWidth={1.5} />
          <span>{tab.label}</span>
        </button>
      ))}
    </div>
  );
}
