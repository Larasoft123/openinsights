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
  language: string;
  workspaceId: string;
  sourceThumbnails: string[];
  archivedAt: Date | null;
  _count: {
    sources: number;
    highlights: number;
  };
  updatedAt: Date;
}

interface ProjectsGridProps {
  projects: Project[];
  /** Callback fired after successful action - use to refresh data */
  onSuccess?: () => void;
}

export function ProjectsGrid({ projects, onSuccess }: ProjectsGridProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  return (
    <>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {/* Create Project Card */}
        <button
          onClick={() => setIsCreateDialogOpen(true)}
          className="group hover:border-accent-primary/50 border-border bg-background/50 hover:bg-background flex h-64 flex-col items-center justify-center rounded-2xl border-2 border-dashed transition-all duration-200"
        >
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
        {projects.map((project) => (
          <ProjectHeroCard
            key={project.id}
            id={project.id}
            name={project.name}
            description={project.description}
            language={project.language}
            workspaceId={project.workspaceId}
            sourceThumbnails={project.sourceThumbnails}
            sourcesCount={project._count.sources}
            highlightsCount={project._count.highlights}
            updatedAt={project.updatedAt}
            archivedAt={project.archivedAt}
            onSuccess={onSuccess}
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
