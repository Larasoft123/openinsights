'use client';

import {
  FolderOpen,
  FileText,
  Tag,
  Lightbulb,
  Search,
  Plus,
  Clock,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Demo/Dashboard Mockup Page
 *
 * Static mockup of the main dashboard for hero screenshot.
 * Uses hardcoded demo data - no database required.
 */

const STATS = [
  { label: 'Projects', value: 12, icon: FolderOpen, color: '#3B82F6' },
  { label: 'Sources', value: 47, icon: FileText, color: '#22C55E' },
  { label: 'Highlights', value: 234, icon: Tag, color: '#F59E0B' },
  { label: 'Themes', value: 18, icon: Lightbulb, color: '#A855F7' },
];

const RECENT_PROJECTS = [
  {
    id: 'p-1',
    name: 'Q4 Product Research',
    description: 'Dashboard redesign user interviews',
    sourcesCount: 5,
    highlightsCount: 45,
    updatedAt: '2 hours ago',
    color: '#3B82F6',
  },
  {
    id: 'p-2',
    name: 'Mobile App Discovery',
    description: 'Exploring mobile use cases',
    sourcesCount: 8,
    highlightsCount: 72,
    updatedAt: '1 day ago',
    color: '#22C55E',
  },
  {
    id: 'p-3',
    name: 'Competitor Analysis',
    description: 'User feedback on alternatives',
    sourcesCount: 3,
    highlightsCount: 28,
    updatedAt: '3 days ago',
    color: '#F59E0B',
  },
  {
    id: 'p-4',
    name: 'Onboarding Study',
    description: 'First-time user experience',
    sourcesCount: 6,
    highlightsCount: 51,
    updatedAt: '1 week ago',
    color: '#A855F7',
  },
];

const RECENT_ACTIVITY = [
  {
    id: 'a-1',
    type: 'highlight',
    description: 'New highlight in Q4 Product Research',
    time: '5 min ago',
  },
  {
    id: 'a-2',
    type: 'source',
    description: 'Source "User Interview - Sarah M." transcribed',
    time: '2 hours ago',
  },
  {
    id: 'a-3',
    type: 'theme',
    description: 'Theme "Navigation Issues" created',
    time: '4 hours ago',
  },
  {
    id: 'a-4',
    type: 'highlight',
    description: 'New highlight in Mobile App Discovery',
    time: '1 day ago',
  },
];

function StatsCard() {
  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6">
      <h2 className="mb-4 text-sm font-medium tracking-wide text-gray-400 uppercase">Overview</h2>
      <div className="space-y-4">
        {STATS.map((stat) => (
          <div key={stat.label} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-lg"
                style={{ backgroundColor: `${stat.color}20` }}
              >
                <stat.icon className="h-5 w-5" style={{ color: stat.color }} />
              </div>
              <span className="text-gray-400">{stat.label}</span>
            </div>
            <span className="text-xl font-semibold text-white">{stat.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ActivityTimeline() {
  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6">
      <h2 className="mb-4 text-sm font-medium tracking-wide text-gray-400 uppercase">
        Recent Activity
      </h2>
      <div className="space-y-4">
        {RECENT_ACTIVITY.map((activity) => (
          <div key={activity.id} className="flex items-start gap-3">
            <div className="mt-1 h-2 w-2 rounded-full bg-blue-500" />
            <div className="flex-1">
              <p className="text-sm text-gray-300">{activity.description}</p>
              <p className="text-xs text-gray-500">{activity.time}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProjectCard({ project }: { project: (typeof RECENT_PROJECTS)[0] }) {
  return (
    <div className="group rounded-xl border border-gray-800 bg-gray-900 p-5 transition-all hover:border-gray-700">
      <div className="mb-3 flex items-start justify-between">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${project.color}20` }}
        >
          <FolderOpen className="h-5 w-5" style={{ color: project.color }} />
        </div>
        <span className="flex items-center gap-1 text-xs text-gray-500">
          <Clock className="h-3 w-3" />
          {project.updatedAt}
        </span>
      </div>

      <h3 className="mb-1 font-medium text-white">{project.name}</h3>
      <p className="mb-4 text-sm text-gray-500">{project.description}</p>

      <div className="flex items-center gap-4 text-xs text-gray-400">
        <span className="flex items-center gap-1">
          <FileText className="h-3 w-3" />
          {project.sourcesCount} sources
        </span>
        <span className="flex items-center gap-1">
          <Tag className="h-3 w-3" />
          {project.highlightsCount} highlights
        </span>
      </div>
    </div>
  );
}

export default function DemoMockupPage() {
  return (
    <div className="min-h-screen bg-gray-950 p-8">
      {/* Layout: Sidebar + Main */}
      <div className="flex gap-8">
        {/* Left Sidebar */}
        <div className="w-80 space-y-6">
          <StatsCard />
          <ActivityTimeline />
        </div>

        {/* Main Area */}
        <div className="flex-1">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-white">Good afternoon, Researcher</h1>
              <p className="mt-1 text-gray-400">
                Here&apos;s what&apos;s happening with your research
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search projects..."
                  className="w-64 rounded-lg border border-gray-700 bg-gray-800 py-2 pr-4 pl-10 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <Button className="gap-2 bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4" />
                New Project
              </Button>
            </div>
          </div>

          {/* Recent Projects */}
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-medium text-white">Recent Projects</h2>
              <button className="text-sm text-blue-400 hover:text-blue-300">View all</button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {RECENT_PROJECTS.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
