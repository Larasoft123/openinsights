import { NextResponse } from 'next/server';
import { jsPDF } from 'jspdf';
import { readFileSync } from 'fs';
import { join } from 'path';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { formatTime } from '@/lib/utils/time';

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
      const pdfBuffer = await generatePDF(project);
      return new NextResponse(pdfBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${sanitizeFilename(project.name)}-insights.pdf"`,
        },
      });
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

/**
 * Load custom fonts (Roboto) into jsPDF for Unicode/Cyrillic support
 */
function loadCustomFonts(doc: jsPDF): void {
  const fontsDir = join(process.cwd(), 'public', 'fonts');

  const fonts = [
    { file: 'Roboto-Regular.ttf', style: 'normal' },
    { file: 'Roboto-Bold.ttf', style: 'bold' },
    { file: 'Roboto-Italic.ttf', style: 'italic' },
  ] as const;

  for (const font of fonts) {
    const fontPath = join(fontsDir, font.file);
    const fontData = readFileSync(fontPath);
    const fontBase64 = fontData.toString('base64');

    doc.addFileToVFS(font.file, fontBase64);
    doc.addFont(font.file, 'Roboto', font.style);
  }
}

async function generatePDF(project: ProjectExport): Promise<ArrayBuffer> {
  const doc = new jsPDF();

  // Load custom fonts for Cyrillic support
  loadCustomFonts(doc);

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = 20;

  const checkPageBreak = (requiredSpace: number) => {
    if (y + requiredSpace > doc.internal.pageSize.getHeight() - 20) {
      doc.addPage();
      y = 20;
    }
  };

  // Title
  doc.setFontSize(24);
  doc.setFont('Roboto', 'bold');
  doc.text(project.name, margin, y);
  y += 10;

  doc.setFontSize(16);
  doc.setFont('Roboto', 'normal');
  doc.text('Research Insights', margin, y);
  y += 15;

  // Metadata
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Workspace: ${project.workspace.name}`, margin, y);
  y += 5;
  doc.text(`Export Date: ${new Date().toLocaleDateString()}`, margin, y);
  y += 5;
  doc.text(`Project Created: ${new Date(project.createdAt).toLocaleDateString()}`, margin, y);
  y += 15;

  // Divider
  doc.setDrawColor(200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  // Themes
  doc.setTextColor(0);
  project.themes.forEach((theme) => {
    checkPageBreak(30);

    // Theme header
    doc.setFontSize(16);
    doc.setFont('Roboto', 'bold');
    doc.text(theme.name, margin, y);
    y += 7;

    if (theme.description) {
      doc.setFontSize(10);
      doc.setFont('Roboto', 'italic');
      doc.setTextColor(80);
      const descLines = doc.splitTextToSize(theme.description, contentWidth);
      doc.text(descLines, margin, y);
      y += descLines.length * 5 + 3;
    }

    doc.setFontSize(10);
    doc.setFont('Roboto', 'normal');
    doc.setTextColor(100);
    doc.text(
      `${theme.highlights.length} highlight${theme.highlights.length !== 1 ? 's' : ''}`,
      margin,
      y
    );
    y += 10;

    // Highlights
    doc.setTextColor(0);
    theme.highlights.forEach((h, index) => {
      const highlight = h.highlight;
      checkPageBreak(40);

      // Quote header
      doc.setFontSize(11);
      doc.setFont('Roboto', 'bold');
      doc.text(`${index + 1}. Quote from "${highlight.segment.source.title}"`, margin, y);
      y += 7;

      // Quote content
      doc.setFontSize(10);
      doc.setFont('Roboto', 'italic');
      doc.setTextColor(60);
      const quoteLines = doc.splitTextToSize(`"${highlight.segment.content}"`, contentWidth - 10);
      checkPageBreak(quoteLines.length * 5 + 15);
      doc.text(quoteLines, margin + 5, y);
      y += quoteLines.length * 5 + 5;

      // Metadata
      doc.setFont('Roboto', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100);
      doc.text(
        `Timestamp: ${formatTime(highlight.segment.startTime)} - ${formatTime(highlight.segment.endTime)}`,
        margin + 5,
        y
      );
      y += 4;
      doc.text(`Tag: ${highlight.tag.name}`, margin + 5, y);
      y += 4;

      if (highlight.note) {
        const noteLines = doc.splitTextToSize(`Note: ${highlight.note}`, contentWidth - 10);
        doc.text(noteLines, margin + 5, y);
        y += noteLines.length * 4;
      }

      y += 8;
      doc.setTextColor(0);
    });

    // Theme divider
    checkPageBreak(15);
    doc.setDrawColor(220);
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;
  });

  // Footer
  checkPageBreak(20);
  doc.setFontSize(9);
  doc.setTextColor(150);
  doc.text('Generated by OpenInsights', margin, y);

  return doc.output('arraybuffer');
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
