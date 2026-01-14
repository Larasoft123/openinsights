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
      language: 'en',
      sourceThumbnails: [],
      archivedAt: null,
      _count: { sources: 12, highlights: 87 },
      updatedAt: new Date('2024-12-10T14:00:00Z'),
    },
    {
      id: '2',
      name: 'Customer Onboarding Study',
      description: 'Understanding the first-time user experience and onboarding friction',
      language: 'en',
      sourceThumbnails: [],
      archivedAt: null,
      _count: { sources: 8, highlights: 54 },
      updatedAt: new Date('2024-12-09T16:00:00Z'),
    },
    {
      id: '3',
      name: 'Feature Validation Sessions',
      description: 'Testing new feature concepts with existing users',
      language: 'en',
      sourceThumbnails: [],
      archivedAt: null,
      _count: { sources: 15, highlights: 103 },
      updatedAt: new Date('2024-12-07T16:00:00Z'),
    },
    {
      id: '4',
      name: 'Competitive Analysis',
      description: 'Interviews with users of competing products',
      language: 'en',
      sourceThumbnails: [],
      archivedAt: null,
      _count: { sources: 6, highlights: 42 },
      updatedAt: new Date('2024-12-05T16:00:00Z'),
    },
    {
      id: '5',
      name: 'Mobile App Usability',
      description: 'Testing the mobile application with target users',
      language: 'en',
      sourceThumbnails: [],
      archivedAt: null,
      _count: { sources: 10, highlights: 68 },
      updatedAt: new Date('2024-12-03T16:00:00Z'),
    },
    {
      id: '6',
      name: 'Accessibility Audit',
      description: 'Evaluating accessibility with users of assistive technology',
      language: 'en',
      sourceThumbnails: [],
      archivedAt: null,
      _count: { sources: 5, highlights: 31 },
      updatedAt: new Date('2024-11-30T16:00:00Z'),
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-foreground text-3xl font-bold">Projects</h1>
          <p className="text-muted-foreground mt-2">Manage your research projects</p>
        </div>

        {/* Filter Pills */}
        <div className="border-border bg-background flex items-center gap-2 rounded-xl border p-1">
          <button className="rounded-lg bg-blue-500/10 px-4 py-2 text-sm font-medium text-blue-400">
            All <span className="text-muted-foreground ml-1.5 text-xs">{mockProjects.length}</span>
          </button>
          <button className="text-muted-foreground hover:text-foreground rounded-lg px-4 py-2 text-sm font-medium transition-colors">
            Active{' '}
            <span className="text-muted-foreground ml-1.5 text-xs">{mockProjects.length}</span>
          </button>
          <button className="text-muted-foreground hover:text-foreground rounded-lg px-4 py-2 text-sm font-medium transition-colors">
            Archived <span className="text-muted-foreground ml-1.5 text-xs">0</span>
          </button>
        </div>
      </div>

      {/* Projects Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {/* Create Project Card */}
        <button className="group hover:border-accent-primary/50 border-border bg-background/50 hover:bg-background flex h-64 flex-col items-center justify-center rounded-2xl border-2 border-dashed transition-all duration-200">
          <div className="group-hover:bg-accent-primary bg-muted mb-4 flex h-16 w-16 items-center justify-center rounded-full transition-all duration-200 group-hover:scale-110">
            <Plus
              size={32}
              className="text-muted-foreground group-hover:text-foreground transition-colors"
            />
          </div>
          <h3 className="text-foreground text-lg font-semibold">Create Project</h3>
          <p className="text-muted-foreground mt-2 text-sm">Start a new research project</p>
        </button>

        {/* Project Cards */}
        {mockProjects.map((project) => (
          <ProjectHeroCard
            key={project.id}
            id={project.id}
            name={project.name}
            description={project.description}
            language={project.language}
            sourceThumbnails={project.sourceThumbnails}
            sourcesCount={project._count.sources}
            highlightsCount={project._count.highlights}
            updatedAt={project.updatedAt}
            archivedAt={project.archivedAt}
          />
        ))}
      </div>
    </div>
  );
}
