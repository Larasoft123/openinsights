import Link from 'next/link';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata = {
  title: 'Dashboard - OpenInsights',
};

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  // Fetch user's projects
  const projects = await prisma.project.findMany({
    where: {
      workspace: {
        id: session.user.workspaceId ?? undefined,
      },
    },
    include: {
      _count: {
        select: {
          sources: true,
        },
      },
    },
    orderBy: {
      updatedAt: 'desc',
    },
    take: 5,
  });

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold">
          Welcome back{session.user.name ? `, ${session.user.name.split(' ')[0]}` : ''}
        </h1>
        <p className="text-muted-foreground mt-1">
          Here&apos;s what&apos;s happening with your research projects
        </p>
      </div>

      {/* Quick Actions */}
      <div className="mb-8 grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{projects.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Sources</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {projects.reduce((acc, p) => acc + p._count.sources, 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Quick Action</CardTitle>
          </CardHeader>
          <CardContent>
            <Link href="/projects">
              <Button size="sm">View All Projects</Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Recent Projects */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent Projects</h2>
          <Link href="/projects">
            <Button variant="outline" size="sm">
              View all
            </Button>
          </Link>
        </div>

        {projects.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground mb-4">No projects yet</p>
              <Link href="/projects">
                <Button>Create your first project</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <Link key={project.id} href={`/projects/${project.id}`}>
                <Card className="h-full transition-shadow hover:shadow-md">
                  <CardHeader>
                    <CardTitle className="text-base">{project.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground line-clamp-2 text-sm">
                      {project.description || 'No description'}
                    </p>
                    <div className="text-muted-foreground mt-4 text-xs">
                      {project._count.sources} source{project._count.sources !== 1 ? 's' : ''}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
