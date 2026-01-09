import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SourcesSection } from '@/components/sources/sources-section';

interface ProjectPageProps {
  params: Promise<{ projectId: string }>;
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { projectId } = await params;
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const project = await prisma.project.findUnique({
    where: {
      id: projectId,
      workspaceId: session.user.workspaceId ?? undefined,
    },
    include: {
      _count: {
        select: {
          sources: { where: { deletedAt: null } },
          tags: true,
          themes: true,
        },
      },
      tags: {
        select: {
          id: true,
          name: true,
          color: true,
        },
        orderBy: { name: 'asc' },
      },
      sources: {
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          fileName: true,
          fileType: true,
          status: true,
          duration: true,
          createdAt: true,
          updatedAt: true,
          processingStep: true,
          processingProgress: true,
          processingStartedAt: true,
          segments: {
            select: {
              highlights: {
                select: {
                  tag: {
                    select: {
                      id: true,
                      name: true,
                      color: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!project) {
    notFound();
  }

  // Count trashed sources
  const trashedCount = await prisma.source.count({
    where: {
      projectId,
      deletedAt: { not: null },
    },
  });

  // Transform sources with aggregated tags
  const sourcesWithTags = project.sources.map((source) => {
    const tagMap = new Map<string, { id: string; name: string; color: string }>();
    let highlightCount = 0;

    for (const segment of source.segments) {
      for (const highlight of segment.highlights) {
        highlightCount++;
        if (!tagMap.has(highlight.tag.id)) {
          tagMap.set(highlight.tag.id, highlight.tag);
        }
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { segments, ...sourceData } = source;

    return {
      ...sourceData,
      tags: Array.from(tagMap.values()),
      highlightCount,
      createdAt: source.createdAt.toISOString(),
      updatedAt: source.updatedAt.toISOString(),
      processingStartedAt: source.processingStartedAt?.toISOString() ?? null,
    };
  });

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      {/* Breadcrumb */}
      <nav className="text-muted-foreground mb-6 flex items-center gap-2 text-sm">
        <Link href="/projects" className="hover:text-foreground">
          Projects
        </Link>
        <span>/</span>
        <span className="text-foreground">{project.name}</span>
      </nav>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold">{project.name}</h1>
        {project.description && <p className="text-muted-foreground mt-2">{project.description}</p>}
      </div>

      {/* Quick Stats */}
      <div className="mb-8 grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Sources</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{project._count.sources}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Tags</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{project._count.tags}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Themes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{project._count.themes}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Created</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-muted-foreground text-sm">
              {new Date(project.createdAt).toLocaleDateString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Actions */}
      <div className="mb-8 flex gap-4">
        <Link href={`/projects/${projectId}/evidence`}>
          <Button size="lg">
            <svg
              className="mr-2 h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
              />
            </svg>
            Evidence Dashboard
          </Button>
        </Link>
        <Link href={`/projects/${projectId}/insights`}>
          <Button size="lg" variant="outline">
            <svg
              className="mr-2 h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"
              />
            </svg>
            Insight Board
          </Button>
        </Link>
      </div>

      {/* Sources Section */}
      <SourcesSection
        projectId={projectId}
        initialSources={sourcesWithTags}
        initialTrashedCount={trashedCount}
        projectTags={project.tags}
      />
    </div>
  );
}
