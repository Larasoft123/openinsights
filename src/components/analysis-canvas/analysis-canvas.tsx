'use client';

import { useRef, useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Check, X, Loader2 } from 'lucide-react';
import { VideoPlayer, KeyboardShortcuts, SourceTags } from './video-player';
import { TranscriptPanel, QuickTagPopover, TagData, TranscriptSegmentData } from './transcript';
import { SpeakerNamesProvider } from './transcript/speaker-names-context';
import { SegmentEditDialog } from './transcript/segment-edit-dialog';
import { SegmentDeleteDialog } from './transcript/segment-delete-dialog';
import { SegmentCreateDialog } from './transcript/segment-create-dialog';
import { useTextSelection } from './hooks';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface SourceData {
  id: string;
  title: string;
  fileUrl: string;
  duration: number | null;
  project: {
    id: string;
    name: string;
    tags: TagData[];
  };
  segments: TranscriptSegmentData[];
}

interface AnalysisCanvasProps {
  source: SourceData;
  initialTime?: number;
  onHighlightCreated?: () => void;
}

/**
 * AnalysisCanvas Component
 *
 * Main layout for the Analysis Canvas - where researchers spend 90% of their time.
 *
 * Features:
 * - 2-column responsive layout (Video | Transcript)
 * - Sticky video player
 * - Synchronized video-transcript playback
 * - Keyboard shortcuts for navigation
 * - Quick Tag popover on text selection
 * - Auto-scrolling transcript with user-interruption detection
 */
export function AnalysisCanvas({ source, initialTime, onHighlightCreated }: AnalysisCanvasProps) {
  const router = useRouter();
  const transcriptContainerRef = useRef<HTMLDivElement>(null);
  const { selection, clearSelection } = useTextSelection(transcriptContainerRef);

  // Segment CRUD state
  const [editingSegment, setEditingSegment] = useState<TranscriptSegmentData | null>(null);
  const [deletingSegment, setDeletingSegment] = useState<TranscriptSegmentData | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // Source title editing state
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(source.title);
  const [isSavingTitle, setIsSavingTitle] = useState(false);

  // Save source title via API
  const handleSaveTitle = useCallback(async () => {
    const trimmed = editedTitle.trim();
    if (!trimmed || trimmed === source.title) {
      setIsEditingTitle(false);
      setEditedTitle(source.title);
      return;
    }

    setIsSavingTitle(true);
    try {
      const res = await fetch(`/api/projects/${source.project.id}/sources/${source.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: trimmed }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update title');
      }

      setIsEditingTitle(false);
      router.refresh();
    } catch (error) {
      console.error('Failed to update title:', error);
      setEditedTitle(source.title);
      setIsEditingTitle(false);
    } finally {
      setIsSavingTitle(false);
    }
  }, [editedTitle, source.title, source.project.id, source.id, router]);

  // Handle highlight creation - refresh server data to update UI
  const handleTagCreated = useCallback(() => {
    // Trigger Next.js server refetch to update segments with new highlights
    router.refresh();
    onHighlightCreated?.();
  }, [router, onHighlightCreated]);

  // Handle segment mutations - refresh server data
  const handleSegmentMutated = useCallback(() => {
    router.refresh();
  }, [router]);

  return (
    <SpeakerNamesProvider projectId={source.project.id}>
      <div className="flex h-screen flex-col">
        {/* Header with breadcrumbs */}
        <header className="bg-background shrink-0 border-b px-6 py-3">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/projects">Projects</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href={`/projects/${source.project.id}`}>{source.project.name}</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {isEditingTitle ? (
                  <div className="flex items-center gap-1">
                    <Input
                      value={editedTitle}
                      onChange={(e) => setEditedTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSaveTitle();
                        } else if (e.key === 'Escape') {
                          setIsEditingTitle(false);
                          setEditedTitle(source.title);
                        }
                      }}
                      onBlur={handleSaveTitle}
                      className="h-7 w-64 text-sm"
                      autoFocus
                      disabled={isSavingTitle}
                    />
                    {isSavingTitle ? (
                      <Loader2 className="text-muted-foreground size-4 animate-spin" />
                    ) : (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={handleSaveTitle}
                        >
                          <Check className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => {
                            setIsEditingTitle(false);
                            setEditedTitle(source.title);
                          }}
                        >
                          <X className="size-4" />
                        </Button>
                      </>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => setIsEditingTitle(true)}
                    className="group hover:bg-muted -ml-1 flex items-center gap-1.5 rounded px-1 transition-colors"
                  >
                    <span className="text-foreground text-sm font-medium">{source.title}</span>
                    <Pencil className="text-muted-foreground size-3 opacity-0 transition-opacity group-hover:opacity-100" />
                  </button>
                )}
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>

        {/* Main content - 2 column resizable layout */}
        <ResizablePanelGroup direction="horizontal" className="flex-1">
          {/* Left panel - Video Player */}
          <ResizablePanel defaultSize={50} minSize={25}>
            <div className="flex h-full flex-col gap-4 overflow-auto p-4">
              <VideoPlayer src={source.fileUrl} initialTime={initialTime} />
              <div className="border-t pt-4">
                <h3 className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
                  Tags in this source
                </h3>
                <SourceTags segments={source.segments} />
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Right panel - Transcript */}
          <ResizablePanel defaultSize={50} minSize={25}>
            <div ref={transcriptContainerRef} className="flex h-full flex-col overflow-hidden">
              <TranscriptPanel
                segments={source.segments}
                sourceId={source.id}
                onEditSegment={setEditingSegment}
                onDeleteSegment={setDeletingSegment}
                onAddSegment={() => setIsCreateDialogOpen(true)}
                onSpeakerChanged={handleSegmentMutated}
              />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>

        {/* Quick Tag Popover - appears on text selection */}
        <QuickTagPopover
          selection={selection}
          tags={source.project.tags}
          sourceId={source.id}
          projectId={source.project.id}
          onTagCreated={handleTagCreated}
          onClose={clearSelection}
        />

        {/* Keyboard shortcuts handler (invisible) */}
        <KeyboardShortcuts />

        {/* Segment CRUD Dialogs */}
        <SegmentEditDialog
          segment={editingSegment}
          sourceId={source.id}
          allSegments={source.segments}
          onClose={() => setEditingSegment(null)}
          onSaved={handleSegmentMutated}
        />

        <SegmentDeleteDialog
          segment={deletingSegment}
          sourceId={source.id}
          onClose={() => setDeletingSegment(null)}
          onDeleted={handleSegmentMutated}
        />

        <SegmentCreateDialog
          open={isCreateDialogOpen}
          sourceId={source.id}
          onClose={() => setIsCreateDialogOpen(false)}
          onCreated={handleSegmentMutated}
        />
      </div>
    </SpeakerNamesProvider>
  );
}
