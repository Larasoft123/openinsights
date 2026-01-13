'use client';

import { Header } from '@/components/dashboard/header';
import { StatsCard } from '@/components/dashboard/stats-card';
import { ActivityTimeline } from '@/components/dashboard/activity-timeline';
import { RecentProjectsGrid } from '@/components/dashboard/recent-projects-grid';

export function MockDashboardPage() {
  // Mock data (using static dates for component purity)
  const mockProjects = [
    {
      id: '1',
      name: 'User Research Q1 2024',
      description: 'Comprehensive user interviews exploring pain points and feature requests',
      sourceThumbnails: [],
      archivedAt: null,
      _count: { sources: 12, highlights: 87 },
      updatedAt: new Date('2024-12-10T14:00:00Z'),
    },
    {
      id: '2',
      name: 'Customer Onboarding Study',
      description: 'Understanding the first-time user experience and onboarding friction',
      sourceThumbnails: [],
      archivedAt: null,
      _count: { sources: 8, highlights: 54 },
      updatedAt: new Date('2024-12-09T16:00:00Z'),
    },
    {
      id: '3',
      name: 'Feature Validation Sessions',
      description: 'Testing new feature concepts with existing users',
      sourceThumbnails: [],
      archivedAt: null,
      _count: { sources: 15, highlights: 103 },
      updatedAt: new Date('2024-12-07T16:00:00Z'),
    },
    {
      id: '4',
      name: 'Competitive Analysis',
      description: 'Interviews with users of competing products',
      sourceThumbnails: [],
      archivedAt: null,
      _count: { sources: 6, highlights: 42 },
      updatedAt: new Date('2024-12-05T16:00:00Z'),
    },
  ];

  const mockActivities = [
    {
      id: '1',
      type: 'highlight_created' as const,
      description:
        'Highlight created in User Research Q1: "The current process is way too manual..."',
      createdAt: new Date('2024-12-10T15:30:00Z'),
    },
    {
      id: '2',
      type: 'source_created' as const,
      description: 'Source "Interview #12 - Sarah" added to User Research Q1 2024',
      createdAt: new Date('2024-12-10T14:00:00Z'),
    },
    {
      id: '3',
      type: 'theme_created' as const,
      description: 'Theme "Pain Points - Manual Workflows" created',
      createdAt: new Date('2024-12-10T11:00:00Z'),
    },
    {
      id: '4',
      type: 'highlight_created' as const,
      description:
        'Highlight created in Customer Onboarding: "I wish there was better guidance..."',
      createdAt: new Date('2024-12-09T16:00:00Z'),
    },
    {
      id: '5',
      type: 'source_created' as const,
      description: 'Source "Onboarding Session #5" added to Customer Onboarding Study',
      createdAt: new Date('2024-12-08T16:00:00Z'),
    },
  ];

  return (
    <div className="flex flex-col gap-8 xl:flex-row">
      {/* Left Sidebar - Stats & Activity */}
      <div className="w-full space-y-8 xl:w-80">
        {/* Stats Card */}
        <StatsCard totalProjects={12} totalSources={47} totalHighlights={286} activeThemes={18} />

        {/* Recent Activity */}
        <ActivityTimeline activities={mockActivities} />
      </div>

      {/* Right Main Area - Projects */}
      <div className="flex-1 space-y-8">
        {/* Header with Greeting and Search */}
        <Header />

        {/* Recent Projects Grid */}
        <RecentProjectsGrid projects={mockProjects} />
      </div>
    </div>
  );
}
