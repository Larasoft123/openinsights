'use client';

import { ProjectHeroCard } from '@/components/projects/project-hero-card';
import { Plus } from 'lucide-react';

export function MockProjectsPage() {
  // Mock data (using static dates for component purity)
  const mockProjects = [
    {
      id: '1',
      name: 'User Research Q1 2024',
      description: 'Comprehensive user interviews exploring pain points and feature requests',
      thumbnailUrl: null,
      _count: { sources: 12, highlights: 87 },
      updatedAt: new Date('2024-12-10T14:00:00Z'),
    },
    {
      id: '2',
      name: 'Customer Onboarding Study',
      description: 'Understanding the first-time user experience and onboarding friction',
      thumbnailUrl: null,
      _count: { sources: 8, highlights: 54 },
      updatedAt: new Date('2024-12-09T16:00:00Z'),
    },
    {
      id: '3',
      name: 'Feature Validation Sessions',
      description: 'Testing new feature concepts with existing users',
      thumbnailUrl: null,
      _count: { sources: 15, highlights: 103 },
      updatedAt: new Date('2024-12-07T16:00:00Z'),
    },
    {
      id: '4',
      name: 'Competitive Analysis',
      description: 'Interviews with users of competing products',
      thumbnailUrl: null,
      _count: { sources: 6, highlights: 42 },
      updatedAt: new Date('2024-12-05T16:00:00Z'),
    },
    {
      id: '5',
      name: 'Mobile App Usability',
      description: 'Testing the mobile application with target users',
      thumbnailUrl: null,
      _count: { sources: 10, highlights: 68 },
      updatedAt: new Date('2024-12-03T16:00:00Z'),
    },
    {
      id: '6',
      name: 'Accessibility Audit',
      description: 'Evaluating accessibility with users of assistive technology',
      thumbnailUrl: null,
      _count: { sources: 5, highlights: 31 },
      updatedAt: new Date('2024-11-30T16:00:00Z'),
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Projects</h1>
          <p className="mt-2 text-gray-400">Manage your research projects</p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 rounded-xl border border-gray-800 bg-gray-900 p-1">
          <button className="rounded-lg bg-blue-500/10 px-4 py-2 text-sm font-medium text-blue-400">
            All <span className="ml-1.5 text-xs text-gray-500">{mockProjects.length}</span>
          </button>
          <button className="rounded-lg px-4 py-2 text-sm font-medium text-gray-400 transition-colors hover:text-white">
            Active <span className="ml-1.5 text-xs text-gray-500">{mockProjects.length}</span>
          </button>
          <button className="rounded-lg px-4 py-2 text-sm font-medium text-gray-400 transition-colors hover:text-white">
            Archived <span className="ml-1.5 text-xs text-gray-500">0</span>
          </button>
        </div>
      </div>

      {/* Projects Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {/* Create Project Card */}
        <button className="group hover:border-accent-primary/50 flex h-64 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-800 bg-gray-900/50 transition-all duration-200 hover:bg-gray-900">
          <div className="group-hover:bg-accent-primary mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-800 transition-all duration-200 group-hover:scale-110">
            <Plus size={32} className="text-gray-400 transition-colors group-hover:text-white" />
          </div>
          <h3 className="text-lg font-semibold text-white">Create Project</h3>
          <p className="mt-2 text-sm text-gray-400">Start a new research project</p>
        </button>

        {/* Project Cards */}
        {mockProjects.map((project) => (
          <ProjectHeroCard
            key={project.id}
            id={project.id}
            name={project.name}
            description={project.description}
            thumbnailUrl={project.thumbnailUrl}
            sourcesCount={project._count.sources}
            highlightsCount={project._count.highlights}
            updatedAt={project.updatedAt}
          />
        ))}
      </div>
    </div>
  );
}
