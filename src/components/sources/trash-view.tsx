'use client';

import { useState, useEffect, useCallback } from 'react';
import { Trash2, RotateCcw, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';

interface TrashedSource {
  id: string;
  title: string;
  fileName: string;
  deletedAt: string;
  segmentCount: number;
}

interface TrashViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onSourceRestored: () => void;
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return `${Math.floor(diffDays / 30)} months ago`;
}

export function TrashView({ open, onOpenChange, projectId, onSourceRestored }: TrashViewProps) {
  const [sources, setSources] = useState<TrashedSource[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [emptyTrashDialogOpen, setEmptyTrashDialogOpen] = useState(false);
  const [permanentDeleteId, setPermanentDeleteId] = useState<string | null>(null);

  const fetchTrashedSources = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/sources/trash`);
      if (res.ok) {
        const data = await res.json();
        setSources(data.sources);
      }
    } catch (error) {
      console.error('Failed to fetch trashed sources:', error);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (open) {
      fetchTrashedSources();
    }
  }, [open, fetchTrashedSources]);

  const handleRestore = async (sourceId: string) => {
    setActionLoading(sourceId);
    try {
      const res = await fetch(`/api/projects/${projectId}/sources/${sourceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restore: true }),
      });

      if (res.ok) {
        setSources((prev) => prev.filter((s) => s.id !== sourceId));
        onSourceRestored();
      }
    } catch (error) {
      console.error('Failed to restore source:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handlePermanentDelete = async (sourceId: string) => {
    setActionLoading(sourceId);
    try {
      const res = await fetch(`/api/projects/${projectId}/sources/${sourceId}?permanent=true`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setSources((prev) => prev.filter((s) => s.id !== sourceId));
      }
    } catch (error) {
      console.error('Failed to permanently delete source:', error);
    } finally {
      setActionLoading(null);
      setPermanentDeleteId(null);
    }
  };

  const handleEmptyTrash = async () => {
    setActionLoading('empty');
    try {
      const res = await fetch(`/api/projects/${projectId}/sources/trash`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setSources([]);
      }
    } catch (error) {
      console.error('Failed to empty trash:', error);
    } finally {
      setActionLoading(null);
      setEmptyTrashDialogOpen(false);
    }
  };

  const sourceToDelete = sources.find((s) => s.id === permanentDeleteId);

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-[400px] sm:w-[540px]">
          <SheetHeader>
            <div className="flex items-center justify-between pr-8">
              <SheetTitle className="flex items-center gap-2">
                <Trash2 className="h-5 w-5" />
                Trash
              </SheetTitle>
              {sources.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEmptyTrashDialogOpen(true)}
                  disabled={actionLoading === 'empty'}
                >
                  Empty Trash
                </Button>
              )}
            </div>
            <SheetDescription>
              {sources.length === 0
                ? 'No items in trash'
                : `${sources.length} item${sources.length !== 1 ? 's' : ''} in trash`}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-3">
            {loading ? (
              <div className="text-muted-foreground py-8 text-center">Loading...</div>
            ) : sources.length === 0 ? (
              <EmptyState
                icon={<Trash2 className="h-8 w-8 opacity-50" />}
                title="Trash is empty"
                className="py-8"
              />
            ) : (
              sources.map((source) => (
                <Card key={source.id} className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{source.title}</p>
                      <p className="text-muted-foreground text-xs">
                        Deleted {formatRelativeTime(source.deletedAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleRestore(source.id)}
                        disabled={actionLoading === source.id}
                        title="Restore"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive h-8 w-8"
                        onClick={() => setPermanentDeleteId(source.id)}
                        disabled={actionLoading === source.id}
                        title="Delete permanently"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>

          {sources.length > 0 && (
            <p className="text-muted-foreground mt-6 text-center text-xs">
              Items in trash can be restored or permanently deleted.
            </p>
          )}
        </SheetContent>
      </Sheet>

      {/* Empty Trash Confirmation */}
      <AlertDialog open={emptyTrashDialogOpen} onOpenChange={setEmptyTrashDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="text-destructive h-5 w-5" />
              Empty Trash?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {sources.length} source
              {sources.length !== 1 ? 's' : ''} and all associated data. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading === 'empty'}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleEmptyTrash}
              disabled={actionLoading === 'empty'}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {actionLoading === 'empty' ? 'Deleting...' : 'Empty Trash'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Permanent Delete Confirmation */}
      <AlertDialog open={!!permanentDeleteId} onOpenChange={() => setPermanentDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="text-destructive h-5 w-5" />
              Delete Permanently?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="text-foreground block font-medium">
                &quot;{sourceToDelete?.title}&quot;
              </span>
              <span className="block">
                This will permanently delete this source and all associated data. This action cannot
                be undone.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => permanentDeleteId && handlePermanentDelete(permanentDeleteId)}
              disabled={!!actionLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {actionLoading ? 'Deleting...' : 'Delete Permanently'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
