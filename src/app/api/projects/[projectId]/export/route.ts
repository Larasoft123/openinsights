import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

/**
 * GET /api/projects/[projectId]/export
 * Export project insights as Markdown or PDF
 *
 * Query params:
 * - format: 'markdown' | 'pdf' (default: markdown)
 * - themeId: optional filter by specific theme
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId } = await params;
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'markdown';
    const themeId = searchParams.get('themeId');

    // Fetch project with themes and highlights (also verifies ownership)
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        workspaceId: session.user.workspaceId ?? undefined,
      },
      select: {
        id: true,
        name: true,
        createdAt: true,
        workspace: {
          select: {
            name: true,
          },
        },
        themes: {
          where: themeId ? { id: themeId } : undefined,
          select: {
            id: true,
            name: true,
            description: true,
            color: true,
            highlights: {
              select: {
                highlight: {
                  select: {
                    id: true,
                    note: true,
                    tag: {
                      select: {
                        name: true,
                        color: true,
                      },
                    },
                    segment: {
                      select: {
                        content: true,
                        startTime: true,
                        endTime: true,
                        source: {
                          select: {
                            title: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          orderBy: { name: 'asc' },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (format === 'markdown') {
      const markdown = generateMarkdown(project);
      return new NextResponse(markdown, {
        headers: {
          'Content-Type': 'text/markdown',
          'Content-Disposition': `attachment; filename="${sanitizeFilename(project.name)}-insights.md"`,
        },
      });
    }

    if (format === 'pdf') {
      // PDF generation would require @react-pdf/renderer
      // For now, return a not-implemented response
      return NextResponse.json(
        { error: 'PDF export not yet implemented. Use format=markdown.' },
        { status: 501 }
      );
    }

    return NextResponse.json({ error: 'Invalid format. Use markdown or pdf.' }, { status: 400 });
  } catch (error) {
    console.error('Export failed:', error);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}

interface ProjectExport {
  id: string;
  name: string;
  createdAt: Date;
  workspace: {
    name: string;
  };
  themes: Array<{
    id: string;
    name: string;
    description: string | null;
    color: string;
    highlights: Array<{
      highlight: {
        id: string;
        note: string | null;
        tag: {
          name: string;
          color: string;
        };
        segment: {
          content: string;
          startTime: number;
          endTime: number;
          source: {
            title: string;
          };
        };
      };
    }>;
  }>;
}

function generateMarkdown(project: ProjectExport): string {
  const lines: string[] = [];

  // Header
  lines.push(`# ${project.name} - Research Insights`);
  lines.push('');
  lines.push(`**Workspace:** ${project.workspace.name}`);
  lines.push(`**Export Date:** ${new Date().toLocaleDateString()}`);
  lines.push(`**Project Created:** ${new Date(project.createdAt).toLocaleDateString()}`);
  lines.push('');
  lines.push('---');
  lines.push('');

  // Table of Contents
  lines.push('## Table of Contents');
  lines.push('');
  project.themes.forEach((theme, index) => {
    lines.push(`${index + 1}. [${theme.name}](#${slugify(theme.name)})`);
  });
  lines.push('');
  lines.push('---');
  lines.push('');

  // Themes
  project.themes.forEach((theme) => {
    lines.push(`## ${theme.name}`);
    lines.push('');

    if (theme.description) {
      lines.push(`*${theme.description}*`);
      lines.push('');
    }

    lines.push(
      `**${theme.highlights.length} highlight${theme.highlights.length !== 1 ? 's' : ''}**`
    );
    lines.push('');

    theme.highlights.forEach((h, index) => {
      const highlight = h.highlight;
      lines.push(`### ${index + 1}. Quote from "${highlight.segment.source.title}"`);
      lines.push('');
      lines.push(`> ${highlight.segment.content}`);
      lines.push('');
      lines.push(
        `- **Timestamp:** ${formatTime(highlight.segment.startTime)} - ${formatTime(highlight.segment.endTime)}`
      );
      lines.push(`- **Tag:** ${highlight.tag.name}`);

      if (highlight.note) {
        lines.push(`- **Note:** ${highlight.note}`);
      }

      lines.push('');
    });

    lines.push('---');
    lines.push('');
  });

  // Footer
  lines.push('');
  lines.push('---');
  lines.push('*Generated by OpenInsights*');

  return lines.join('\n');
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-');
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase();
}
