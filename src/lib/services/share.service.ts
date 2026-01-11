import { prisma } from '../db';

// Types for shared project data
export interface SharedTagData {
  id: string;
  name: string;
  color: string;
  _count: {
    highlights: number;
  };
}

export interface SharedThemeHighlight {
  highlight: {
    id: string;
    note: string | null;
    selectedText: string | null;
    tag: {
      id: string;
      name: string;
      color: string;
    };
    segment: {
      id: string;
      content: string;
      startTime: number;
      endTime: number;
      speakerId: string | null;
      source: {
        id: string;
        title: string;
      };
    };
  };
}

export interface SharedTheme {
  id: string;
  name: string;
  description: string | null;
  color: string;
  highlights: SharedThemeHighlight[];
}

export interface SharedHighlight {
  id: string;
  note: string | null;
  selectedText: string | null;
  createdAt: Date;
  tag: {
    id: string;
    name: string;
    color: string;
  };
  segment: {
    id: string;
    content: string;
    startTime: number;
    endTime: number;
    speakerId: string | null;
    source: {
      id: string;
      title: string;
    };
  };
  themes: {
    theme: {
      id: string;
      name: string;
      color: string;
    };
  }[];
}

export interface SharedProjectData {
  id: string;
  name: string;
  description: string | null;
  summary: unknown;
  summaryStatus: string | null;
  createdAt: Date;
  updatedAt: Date;
  sources: {
    id: string;
    title: string;
    duration: number | null;
    status: string;
    createdAt: Date;
  }[];
  tags?: SharedTagData[];
  themes?: SharedTheme[];
  highlights: SharedHighlight[] | null;
}

export interface CreateProjectShareLinkOptions {
  includeEvidence?: boolean;
  includeInsights?: boolean;
  expiresAt?: Date | null;
}

export interface CreateSourceShareLinkOptions {
  expiresAt?: Date | null;
}

export interface ShareLinkWithResource {
  id: string;
  token: string;
  includeEvidence: boolean;
  includeInsights: boolean;
  expiresAt: Date | null;
  isActive: boolean;
  createdAt: Date;
  sourceId: string | null;
  project: {
    id: string;
    name: string;
    description: string | null;
  };
  source: {
    id: string;
    title: string;
  } | null;
}

/**
 * Create a share link for a project
 */
export async function createProjectShareLink(
  projectId: string,
  userId: string,
  options: CreateProjectShareLinkOptions = {}
) {
  const { includeEvidence = true, includeInsights = true, expiresAt = null } = options;

  const shareLink = await prisma.shareLink.create({
    data: {
      projectId,
      createdById: userId,
      includeEvidence,
      includeInsights,
      expiresAt,
    },
    include: {
      project: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  return shareLink;
}

/**
 * Create a share link for a source
 */
export async function createSourceShareLink(
  sourceId: string,
  userId: string,
  options: CreateSourceShareLinkOptions = {}
) {
  const { expiresAt = null } = options;

  // Get the source to find its project
  const source = await prisma.source.findUnique({
    where: { id: sourceId },
    select: { projectId: true, title: true },
  });

  if (!source) {
    throw new Error('Source not found');
  }

  const shareLink = await prisma.shareLink.create({
    data: {
      projectId: source.projectId,
      sourceId,
      createdById: userId,
      includeEvidence: true, // Always true for source shares
      includeInsights: false, // Not applicable for source shares
      expiresAt,
    },
    include: {
      project: {
        select: {
          id: true,
          name: true,
        },
      },
      source: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  });

  return shareLink;
}

/**
 * Validate a share link token and return the resource data
 * Returns null if token is invalid, expired, or inactive
 */
export async function validateShareLink(token: string): Promise<ShareLinkWithResource | null> {
  const shareLink = await prisma.shareLink.findUnique({
    where: { token },
    include: {
      project: {
        select: {
          id: true,
          name: true,
          description: true,
        },
      },
      source: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  });

  if (!shareLink) {
    return null;
  }

  // Check if link is active
  if (!shareLink.isActive) {
    return null;
  }

  // Check if link has expired
  if (shareLink.expiresAt && shareLink.expiresAt < new Date()) {
    return null;
  }

  return shareLink;
}

/**
 * Get all share links for a project
 */
export async function getProjectShareLinks(projectId: string) {
  const shareLinks = await prisma.shareLink.findMany({
    where: {
      projectId,
      sourceId: null, // Only project-level shares
    },
    include: {
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return shareLinks;
}

/**
 * Get all share links for a source
 */
export async function getSourceShareLinks(sourceId: string) {
  const shareLinks = await prisma.shareLink.findMany({
    where: {
      sourceId,
    },
    include: {
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return shareLinks;
}

/**
 * Revoke (soft delete) a share link
 */
export async function revokeShareLink(linkId: string, userId: string) {
  // Verify ownership
  const shareLink = await prisma.shareLink.findUnique({
    where: { id: linkId },
    select: { createdById: true },
  });

  if (!shareLink) {
    throw new Error('Share link not found');
  }

  if (shareLink.createdById !== userId) {
    throw new Error('Not authorized to revoke this link');
  }

  const revokedLink = await prisma.shareLink.update({
    where: { id: linkId },
    data: { isActive: false },
  });

  return revokedLink;
}

/**
 * Get shared project data for public view
 */
export async function getSharedProjectData(
  projectId: string,
  options: { includeEvidence: boolean; includeInsights: boolean }
): Promise<SharedProjectData | null> {
  const { includeEvidence, includeInsights } = options;

  // Fetch base project data
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      name: true,
      description: true,
      summary: true,
      summaryStatus: true,
      createdAt: true,
      updatedAt: true,
      sources: {
        where: { deletedAt: null },
        select: {
          id: true,
          title: true,
          duration: true,
          status: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!project) {
    return null;
  }

  // Fetch tags if evidence is included
  let tags: SharedTagData[] | undefined;
  if (includeEvidence) {
    tags = await prisma.tag.findMany({
      where: { projectId },
      select: {
        id: true,
        name: true,
        color: true,
        _count: {
          select: { highlights: true },
        },
      },
    });
  }

  // Fetch themes if insights is included
  let themes: SharedTheme[] | undefined;
  if (includeInsights) {
    const rawThemes = await prisma.theme.findMany({
      where: { projectId },
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
                selectedText: true,
                tag: {
                  select: {
                    id: true,
                    name: true,
                    color: true,
                  },
                },
                segment: {
                  select: {
                    id: true,
                    content: true,
                    startTime: true,
                    endTime: true,
                    speakerId: true,
                    source: {
                      select: {
                        id: true,
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
    });
    themes = rawThemes as SharedTheme[];
  }

  // Fetch highlights if evidence is included
  let highlights: SharedHighlight[] | null = null;
  if (includeEvidence) {
    const rawHighlights = await prisma.highlight.findMany({
      where: {
        segment: {
          source: {
            projectId,
            deletedAt: null,
          },
        },
      },
      select: {
        id: true,
        note: true,
        selectedText: true,
        createdAt: true,
        tag: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
        segment: {
          select: {
            id: true,
            content: true,
            startTime: true,
            endTime: true,
            speakerId: true,
            source: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
        themes: {
          select: {
            theme: {
              select: {
                id: true,
                name: true,
                color: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    highlights = rawHighlights as SharedHighlight[];
  }

  return {
    ...project,
    tags,
    themes,
    highlights,
  };
}

/**
 * Get shared source data for public view
 */
export async function getSharedSourceData(sourceId: string) {
  const source = await prisma.source.findUnique({
    where: { id: sourceId },
    select: {
      id: true,
      title: true,
      fileName: true,
      fileUrl: true,
      fileType: true,
      duration: true,
      status: true,
      summary: true,
      summaryStatus: true,
      createdAt: true,
      project: {
        select: {
          id: true,
          name: true,
        },
      },
      segments: {
        select: {
          id: true,
          content: true,
          startTime: true,
          endTime: true,
          speakerId: true,
          highlights: {
            select: {
              id: true,
              note: true,
              selectedText: true,
              tag: {
                select: {
                  id: true,
                  name: true,
                  color: true,
                },
              },
              themes: {
                select: {
                  theme: {
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
        orderBy: { startTime: 'asc' },
      },
    },
  });

  return source;
}
