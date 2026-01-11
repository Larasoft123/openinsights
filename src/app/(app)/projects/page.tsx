'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { ProjectsGrid } from '@/components/projects/projects-grid';
import { ProjectPillFilter } from '@/components/projects/project-pill-filter';

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
  isArchived?: boolean;
}

export default function ProjectsPage() {
  const { status } = useSession();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'archived'>('all');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (status === 'authenticated') {
      fetchProjects();
    }
  }, [status, router]);

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects');
      if (response.ok) {
        const data = await response.json();
        setProjects(data);
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-muted-foreground">Loading projects...</p>
      </div>
    );
  }

  // Filter projects based on active filter
  const filteredProjects = projects.filter((project) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'archived') return project.isArchived;
    if (activeFilter === 'active') return !project.isArchived;
    return true;
  });

  // Calculate counts for filter pills
  const filterCounts = {
    all: projects.length,
    active: projects.filter((p) => !p.isArchived).length,
    archived: projects.filter((p) => p.isArchived).length,
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-foreground text-3xl font-bold">Projects</h1>
          <p className="text-muted-foreground mt-2">Manage your research projects</p>
        </div>

        {/* Filter Pills */}
        <ProjectPillFilter
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          counts={filterCounts}
        />
      </div>

      {/* Projects Grid */}
      <ProjectsGrid projects={filteredProjects} />
    </div>
  );
}
