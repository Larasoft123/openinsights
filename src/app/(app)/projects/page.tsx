'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { ProjectsGrid } from '@/components/projects/projects-grid';
import { ProjectPillFilter } from '@/components/projects/project-pill-filter';
import { GlobalSearch } from '@/components/dashboard/header/global-search';

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

export default function ProjectsPage() {
  const { status } = useSession();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'archived'>('active');
  const [searchOpen, setSearchOpen] = useState(false);

  // Detect platform for keyboard shortcut display
  const isMac =
    typeof window !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;

  // Handle Ctrl+K / Cmd+K to open search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearchOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
      // Fetch all projects (active and archived) for client-side filtering
      const response = await fetch('/api/projects?filter=all');
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
        <p className="text-gray-400">Loading projects...</p>
      </div>
    );
  }

  // Filter projects based on active filter
  const filteredProjects = projects.filter((project) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'archived') return !!project.archivedAt;
    if (activeFilter === 'active') return !project.archivedAt;
    return true;
  });

  // Calculate counts for filter pills
  const filterCounts = {
    all: projects.length,
    active: projects.filter((p) => !p.archivedAt).length,
    archived: projects.filter((p) => !!p.archivedAt).length,
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Projects</h1>
          <p className="mt-2 text-gray-400">Manage your research projects</p>
        </div>

        {/* Filter Pills and Search */}
        <div className="flex items-center gap-3">
          <ProjectPillFilter
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
            counts={filterCounts}
          />
          <button
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-gray-800 px-4 py-2 text-sm text-gray-400 transition-colors hover:bg-gray-700 hover:text-white"
          >
            <Search size={16} strokeWidth={1.5} />
            <span className="hidden sm:inline">Search...</span>
            <span className="ml-2 hidden text-xs text-gray-500 md:inline">
              {isMac ? '⌘K' : 'Ctrl+K'}
            </span>
          </button>
        </div>
      </div>

      {/* Projects Grid */}
      <ProjectsGrid projects={filteredProjects} onSuccess={fetchProjects} />

      {/* Global Search Dialog */}
      <GlobalSearch isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
