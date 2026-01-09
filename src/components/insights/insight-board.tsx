'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { ChevronRight, Plus, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeColumn } from './theme-column';
import { HighlightCard } from './highlight-card';
import { CreateThemeDialog } from './create-theme-dialog';
import { MagicClusterDialog } from './magic-cluster-dialog';

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface Segment {
  id: string;
  content: string;
  startTime: number;
  endTime: number;
  source: {
    id: string;
    title: string;
  };
}

interface Highlight {
  id: string;
  note: string | null;
  tag: Tag;
  segment: Segment;
}

interface Theme {
  id: string;
  name: string;
  description: string | null;
  color: string;
  highlights: Highlight[];
}

interface Project {
  id: string;
  name: string;
  workspace: {
    id: string;
    name: string;
    slug: string;
  };
}

interface InsightBoardProps {
  project: Project;
  themes: Theme[];
  unassignedHighlights: Highlight[];
}

export function InsightBoard({
  project,
  themes: initialThemes,
  unassignedHighlights: initialUnassigned,
}: InsightBoardProps) {
  const [themes, setThemes] = useState(initialThemes);
  const [unassigned, setUnassigned] = useState(initialUnassigned);
  const [activeHighlight, setActiveHighlight] = useState<Highlight | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showMagicCluster, setShowMagicCluster] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  );

  const findHighlight = useCallback(
    (id: string): Highlight | undefined => {
      // Check unassigned
      const unassignedMatch = unassigned.find((h) => h.id === id);
      if (unassignedMatch) return unassignedMatch;

      // Check themes
      for (const theme of themes) {
        const match = theme.highlights.find((h) => h.id === id);
        if (match) return match;
      }
      return undefined;
    },
    [themes, unassigned]
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const highlight = findHighlight(active.id as string);
    setActiveHighlight(highlight || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveHighlight(null);

    if (!over) return;

    const highlightId = active.id as string;
    const targetId = over.id as string;

    // Determine source container
    const isFromUnassigned = unassigned.some((h) => h.id === highlightId);
    const sourceTheme = themes.find((t) => t.highlights.some((h) => h.id === highlightId));

    // Determine target container
    const isToUnassigned = targetId === 'unassigned';
    const targetTheme = themes.find((t) => t.id === targetId);

    // No change needed if dropping in same container
    if (isFromUnassigned && isToUnassigned) return;
    if (sourceTheme && targetTheme && sourceTheme.id === targetTheme.id) return;

    const highlight = findHighlight(highlightId);
    if (!highlight) return;

    // Optimistic update
    if (isFromUnassigned) {
      setUnassigned((prev) => prev.filter((h) => h.id !== highlightId));
    } else if (sourceTheme) {
      setThemes((prev) =>
        prev.map((t) =>
          t.id === sourceTheme.id
            ? { ...t, highlights: t.highlights.filter((h) => h.id !== highlightId) }
            : t
        )
      );
    }

    if (isToUnassigned) {
      setUnassigned((prev) => [...prev, highlight]);
    } else if (targetTheme) {
      setThemes((prev) =>
        prev.map((t) =>
          t.id === targetTheme.id ? { ...t, highlights: [...t.highlights, highlight] } : t
        )
      );
    }

    // API call
    try {
      if (targetTheme) {
        // Add to theme
        await fetch(`/api/projects/${project.id}/themes/${targetTheme.id}/highlights`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ highlightId }),
        });
      }

      if (sourceTheme && !targetTheme) {
        // Remove from theme (back to unassigned)
        await fetch(
          `/api/projects/${project.id}/themes/${sourceTheme.id}/highlights/${highlightId}`,
          {
            method: 'DELETE',
          }
        );
      }

      if (sourceTheme && targetTheme) {
        // Move between themes - remove from old, add to new
        await fetch(
          `/api/projects/${project.id}/themes/${sourceTheme.id}/highlights/${highlightId}`,
          {
            method: 'DELETE',
          }
        );
        await fetch(`/api/projects/${project.id}/themes/${targetTheme.id}/highlights`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ highlightId }),
        });
      }
    } catch (error) {
      console.error('Failed to update highlight theme:', error);
      // Revert on error - reload page for simplicity
      window.location.reload();
    }
  };

  const handleThemeCreated = (newTheme: {
    id: string;
    name: string;
    description: string | null;
    color: string;
  }) => {
    setThemes((prev) => [...prev, { ...newTheme, highlights: [] }]);
    setShowCreateDialog(false);
  };

  const handleThemeDeleted = async (themeId: string) => {
    const theme = themes.find((t) => t.id === themeId);
    if (!theme) return;

    // Move highlights back to unassigned
    setUnassigned((prev) => [...prev, ...theme.highlights]);
    setThemes((prev) => prev.filter((t) => t.id !== themeId));

    try {
      await fetch(`/api/projects/${project.id}/themes/${themeId}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.error('Failed to delete theme:', error);
      window.location.reload();
    }
  };

  const handleMagicClusterAccept = async (
    suggestedThemes: Array<{
      name: string;
      description: string | null;
      color: string;
      highlightIds: string[];
    }>
  ) => {
    // Create each theme and assign its highlights
    for (const suggested of suggestedThemes) {
      // Create the theme
      const createRes = await fetch(`/api/projects/${project.id}/themes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: suggested.name,
          description: suggested.description,
          color: suggested.color,
        }),
      });

      if (!createRes.ok) {
        throw new Error('Failed to create theme');
      }

      const { theme: newTheme } = await createRes.json();

      // Assign highlights to the theme
      for (const highlightId of suggested.highlightIds) {
        await fetch(`/api/projects/${project.id}/themes/${newTheme.id}/highlights`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ highlightId }),
        });
      }

      // Update local state
      const movedHighlights = unassigned.filter((h) => suggested.highlightIds.includes(h.id));
      setUnassigned((prev) => prev.filter((h) => !suggested.highlightIds.includes(h.id)));
      setThemes((prev) => [...prev, { ...newTheme, highlights: movedHighlights }]);
    }
  };

  return (
    <div className="bg-background flex h-screen flex-col">
      {/* Header */}
      <header className="bg-card border-b px-6 py-4">
        {/* Breadcrumb */}
        <nav className="text-muted-foreground mb-2 flex items-center gap-2 text-sm">
          <Link href="/" className="hover:text-foreground">
            {project.workspace.name}
          </Link>
          <ChevronRight className="h-4 w-4" />
          <Link href={`/projects/${project.id}`} className="hover:text-foreground">
            {project.name}
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground">Insights</span>
        </nav>

        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Insight Board</h1>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => setShowMagicCluster(true)}
              disabled={unassigned.length < 3}
              title={unassigned.length < 3 ? 'Need at least 3 unassigned highlights' : undefined}
            >
              <Sparkles className="h-4 w-4" />
              Magic Cluster
            </Button>
            <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              New Theme
            </Button>
          </div>
        </div>
      </header>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto p-6">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex h-full gap-4">
            {/* Unassigned Column */}
            <ThemeColumn
              id="unassigned"
              title="Unassigned"
              color="#6B7280"
              highlights={unassigned}
              isUnassigned
            />

            {/* Theme Columns */}
            {themes.map((theme) => (
              <ThemeColumn
                key={theme.id}
                id={theme.id}
                title={theme.name}
                description={theme.description}
                color={theme.color}
                highlights={theme.highlights}
                onDelete={() => handleThemeDeleted(theme.id)}
              />
            ))}

            {/* Add Theme Button (empty column) */}
            {themes.length < 6 && (
              <div className="border-muted flex w-72 flex-shrink-0 flex-col rounded-lg border-2 border-dashed p-4">
                <button
                  onClick={() => setShowCreateDialog(true)}
                  className="text-muted-foreground hover:text-foreground flex h-full items-center justify-center transition-colors"
                >
                  <Plus className="mr-2 h-5 w-5" />
                  Add Theme
                </button>
              </div>
            )}
          </div>

          {/* Drag Overlay */}
          <DragOverlay>
            {activeHighlight ? <HighlightCard highlight={activeHighlight} isDragging /> : null}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Create Theme Dialog */}
      <CreateThemeDialog
        projectId={project.id}
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onCreated={handleThemeCreated}
      />

      {/* Magic Cluster Dialog */}
      <MagicClusterDialog
        projectId={project.id}
        open={showMagicCluster}
        onOpenChange={setShowMagicCluster}
        unassignedCount={unassigned.length}
        onAccept={handleMagicClusterAccept}
      />
    </div>
  );
}
