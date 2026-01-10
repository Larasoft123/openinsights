/**
 * Stats Card Component
 *
 * Single card displaying all key metrics.
 * Follows Modern Smart Home Dashboard sidebar widget pattern.
 */

'use client';

import { FolderOpen, FileVideo, Tag, Target } from 'lucide-react';

interface StatsCardProps {
  totalProjects: number;
  totalSources: number;
  totalHighlights: number;
  activeThemes: number;
}

export function StatsCard({
  totalProjects,
  totalSources,
  totalHighlights,
  activeThemes,
}: StatsCardProps) {
  const stats = [
    { label: 'Projects', value: totalProjects, icon: FolderOpen, color: 'text-blue-500' },
    { label: 'Sources', value: totalSources, icon: FileVideo, color: 'text-purple-500' },
    { label: 'Highlights', value: totalHighlights, icon: Tag, color: 'text-green-500' },
    { label: 'Themes', value: activeThemes, icon: Target, color: 'text-orange-500' },
  ];

  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6">
      <h3 className="mb-6 text-lg font-semibold text-white">Overview</h3>

      <div className="space-y-4">
        {stats.map((stat) => (
          <div key={stat.label} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <stat.icon size={18} strokeWidth={1.5} className={stat.color} />
              <span className="text-sm text-gray-400">{stat.label}</span>
            </div>
            <span className="text-lg font-semibold text-white">{stat.value.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
