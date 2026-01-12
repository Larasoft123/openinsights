/**
 * Recent Projects Grid Component
 *
 * Displays recent projects in a responsive grid with Hero Cards.
 * Follows Modern Smart Home Dashboard grid pattern.
 */

'use client';

import { ProjectHeroCard } from '@/components/projects/project-hero-card';
import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Project {
  id: string;
  name: string;
  description: string | null;
  thumbnailUrl: string | null;
  archivedAt: Date | null;
  _count: {
    sources: number;
    highlights: number;
  };
  updatedAt: Date;
}

interface RecentProjectsGridProps {
  projects: Project[];
}

export function RecentProjectsGrid({ projects }: RecentProjectsGridProps) {
  const router = useRouter();

  if (projects.length === 0) {
    return (
      <div className="border-border bg-background/50 flex flex-col items-center justify-center rounded-2xl border border-dashed p-12">
        <div className="bg-muted mb-4 flex h-16 w-16 items-center justify-center rounded-full">
          <Plus size={32} strokeWidth={1.5} className="text-muted-foreground" />
        </div>
        <h3 className="text-foreground mb-2 text-lg font-semibold">No projects yet</h3>
        <p className="text-muted-foreground mb-6 text-center text-sm">
          Create your first project to start organizing your research
        </p>
        <button
          onClick={() => router.push('/projects')}
          className="bg-accent-primary hover:bg-accent-primary/90 text-foreground rounded-lg px-6 py-2.5 text-sm font-medium transition-colors"
        >
          Create Project
        </button>
      </div>
    );
  }

  const [latestProject, ...otherProjects] = projects;

  return (
    <div className="space-y-8">
      {/* Latest Project - Full Width */}
      {latestProject && (
        <ProjectHeroCard
          key={latestProject.id}
          id={latestProject.id}
          name={latestProject.name}
          description={latestProject.description}
          thumbnailUrl={latestProject.thumbnailUrl}
          sourcesCount={latestProject._count.sources}
          highlightsCount={latestProject._count.highlights}
          updatedAt={latestProject.updatedAt}
          archivedAt={latestProject.archivedAt}
        />
      )}

      {/* Other Projects - 3 Column Grid */}
      {otherProjects.length > 0 && (
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {otherProjects.map((project) => (
            <ProjectHeroCard
              key={project.id}
              id={project.id}
              name={project.name}
              description={project.description}
              thumbnailUrl={project.thumbnailUrl}
              sourcesCount={project._count.sources}
              highlightsCount={project._count.highlights}
              updatedAt={project.updatedAt}
              archivedAt={project.archivedAt}
            />
          ))}
        </div>
      )}

      {/* View All Button */}
      <div className="flex justify-center pt-4">
        <button
          onClick={() => router.push('/projects')}
          className="border-border bg-background text-foreground hover:border-border hover:bg-muted rounded-lg border px-6 py-3 text-sm font-medium transition-colors"
        >
          View all projects →
        </button>
      </div>
    </div>
  );
}
