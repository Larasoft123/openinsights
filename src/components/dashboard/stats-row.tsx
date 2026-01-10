/**
 * Stats Row Component
 *
 * Displays key metrics in a 4-column grid with icons.
 * Follows Modern Smart Home Dashboard card pattern.
 */

'use client';

import { FolderOpen, FileVideo, Tag, Target } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: number;
  icon: LucideIcon;
  color: string;
}

function StatCard({ label, value, icon: Icon, color }: StatCardProps) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-gray-800 bg-gray-900 p-6 transition-all duration-200 hover:border-gray-700">
      <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${color}`}>
        <Icon size={24} className="text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-white">{value.toLocaleString()}</p>
        <p className="text-sm text-gray-400">{label}</p>
      </div>
    </div>
  );
}

interface StatsRowProps {
  totalProjects: number;
  totalSources: number;
  totalHighlights: number;
  activeThemes: number;
}

export function StatsRow({
  totalProjects,
  totalSources,
  totalHighlights,
  activeThemes,
}: StatsRowProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard label="Projects" value={totalProjects} icon={FolderOpen} color="bg-blue-600" />
      <StatCard label="Sources" value={totalSources} icon={FileVideo} color="bg-purple-600" />
      <StatCard label="Highlights" value={totalHighlights} icon={Tag} color="bg-green-600" />
      <StatCard label="Themes" value={activeThemes} icon={Target} color="bg-orange-600" />
    </div>
  );
}
