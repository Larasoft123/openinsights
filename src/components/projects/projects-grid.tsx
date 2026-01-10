/**
 * Projects Grid Component
 *
 * Displays all projects in a responsive grid with Hero Cards and create button.
 * Follows Modern Smart Home Dashboard grid pattern.
 */

'use client';

import { ProjectHeroCard } from './project-hero-card';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { CreateProjectDialog } from './create-project-dialog';

interface Project {
  id: string;
  name: string;
  description: string | null;
  thumbnailUrl: string | null;
  _count: {
    sources: number;
    highlights: number;
  };
  updatedAt: Date;
}

interface ProjectsGridProps {
  projects: Project[];
}

export function ProjectsGrid({ projects }: ProjectsGridProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  return (
    <>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {/* Create Project Card */}
        <button
          onClick={() => setIsCreateDialogOpen(true)}
          className="group hover:border-accent-primary/50 flex h-64 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-800 bg-gray-900/50 transition-all duration-200 hover:bg-gray-900"
        >
          <div className="group-hover:bg-accent-primary mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-800 transition-all duration-200 group-hover:scale-110">
            <Plus size={32} className="text-gray-400 transition-colors group-hover:text-white" />
          </div>
          <h3 className="text-lg font-semibold text-white">Create Project</h3>
          <p className="mt-2 text-sm text-gray-400">Start a new research project</p>
        </button>

        {/* Project Cards */}
        {projects.map((project) => (
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

      {/* Create Project Dialog */}
      <CreateProjectDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
      />
    </>
  );
}
