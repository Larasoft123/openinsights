import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import {
  getDashboardStats,
  listRecentProjects,
  listRecentActivity,
  getWorkspaceByUserId,
} from '@/lib/db/tenant-queries';
import { StatsCard } from '@/components/dashboard/stats-card';
import { RecentProjectsGrid } from '@/components/dashboard/recent-projects-grid';
import { ActivityTimeline } from '@/components/dashboard/activity-timeline';
import { Header } from '@/components/dashboard/header';

export const metadata = {
  title: 'Dashboard - OpenInsights',
};

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user?.currentSchemaName) {
    redirect('/login');
  }

  const schemaName = session.user.currentSchemaName;
  const userId = session.user.id;

  // Get workspace for this user in tenant schema
  const workspace = await getWorkspaceByUserId(schemaName, userId);

  if (!workspace) {
    redirect('/login');
  }

  const workspaceId = workspace.id;

  // Fetch all dashboard data in parallel
  const [stats, recentProjects, recentActivities] = await Promise.all([
    getDashboardStats(schemaName, workspaceId),
    listRecentProjects(schemaName, workspaceId, 6),
    listRecentActivity(schemaName, workspaceId, 5),
  ]);

  return (
    <div className="flex flex-col gap-8 xl:flex-row">
      {/* Left Sidebar - Stats & Activity */}
      <div className="w-full space-y-8 xl:w-80">
        {/* Stats Card */}
        <StatsCard
          totalProjects={stats.totalProjects}
          totalSources={stats.totalSources}
          totalHighlights={stats.totalHighlights}
          activeThemes={stats.activeThemes}
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
