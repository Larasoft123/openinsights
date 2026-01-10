import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';
import { StatsCard } from '@/components/dashboard/stats-card';
import { RecentProjectsGrid } from '@/components/dashboard/recent-projects-grid';
import { ActivityTimeline } from '@/components/dashboard/activity-timeline';
import { Header } from '@/components/dashboard/header';

export const metadata = {
  title: 'Dashboard - OpenInsights',
};

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const workspaceId = session.user.workspaceId;

  if (!workspaceId) {
    redirect('/login');
  }

  // Fetch comprehensive stats
  const [
    totalProjects,
    totalSources,
    totalHighlights,
    activeThemes,
    recentProjects,
    recentActivities,
  ] = await Promise.all([
    // Total projects count
    prisma.project.count({
      where: { workspaceId },
    }),

    // Total sources count
    prisma.source.count({
      where: {
        project: { workspaceId },
      },
    }),

    // Total highlights count
    prisma.highlight.count({
      where: {
        segment: {
          source: {
            project: { workspaceId },
          },
        },
      },
    }),

    // Active themes count
    prisma.theme.count({
      where: {
        project: { workspaceId },
      },
    }),

    // Recent projects (last 6)
    prisma.project
      .findMany({
        where: { workspaceId },
        select: {
          id: true,
          name: true,
          description: true,
          updatedAt: true,
          _count: {
            select: {
              sources: true,
            },
          },
        },
        orderBy: {
          updatedAt: 'desc',
        },
        take: 6,
      })
      .then((projects) =>
        projects.map((p) => ({
          ...p,
          thumbnailUrl: null,
          _count: {
            sources: p._count.sources,
            highlights: 0,
          },
        }))
      ),

    // Recent activity (simplified for now - just recent sources and highlights)
    Promise.all([
      prisma.source.findMany({
        where: {
          project: { workspaceId },
        },
        select: {
          id: true,
          title: true,
          createdAt: true,
          project: {
            select: { name: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 3,
      }),
      prisma.highlight.findMany({
        where: {
          segment: {
            source: {
              project: { workspaceId },
            },
          },
        },
        select: {
          id: true,
          createdAt: true,
          segment: {
            select: {
              content: true,
              source: {
                select: {
                  project: {
                    select: { name: true },
                  },
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 3,
      }),
    ]).then(([sources, highlights]) => {
      const activities = [
        ...sources.map((s) => ({
          id: s.id,
          type: 'source_created' as const,
          description: `Source "${s.title}" added to ${s.project.name}`,
          createdAt: s.createdAt,
        })),
        ...highlights.map((h) => ({
          id: h.id,
          type: 'highlight_created' as const,
          description: `Highlight created in ${h.segment.source.project.name}: "${h.segment.content.slice(0, 50)}${h.segment.content.length > 50 ? '...' : ''}"`,
          createdAt: h.createdAt,
        })),
      ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      return activities.slice(0, 5);
    }),
  ]);

  return (
    <div className="flex flex-col gap-8 xl:flex-row">
      {/* Left Sidebar - Stats & Activity */}
      <div className="w-full space-y-8 xl:w-80">
        {/* Stats Card */}
        <StatsCard
          totalProjects={totalProjects}
          totalSources={totalSources}
          totalHighlights={totalHighlights}
          activeThemes={activeThemes}
        />

        {/* Recent Activity */}
        <ActivityTimeline activities={recentActivities} />
      </div>

      {/* Right Main Area - Projects */}
      <div className="flex-1 space-y-8">
        {/* Header with Greeting and Search */}
        <Header />

        {/* Recent Projects Grid */}
        <RecentProjectsGrid projects={recentProjects} />
      </div>
    </div>
  );
}
