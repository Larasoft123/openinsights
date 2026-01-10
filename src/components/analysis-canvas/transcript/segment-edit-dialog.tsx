'use client';

import { useState, useEffect, useMemo } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { getSpeakerColor, getUniqueSpeakers } from '@/lib/utils/speaker-colors';
import { useSpeakerNamesContext } from './speaker-names-context';

interface TranscriptSegmentData {
  id: string;
  content: string;
  startTime: number;
  endTime: number;
  speakerId: string | null;
  highlights?: Array<{
    id: string;
    tag: { id: string; name: string; color: string };
  }>;
}

interface SegmentEditDialogProps {
  segment: TranscriptSegmentData | null;
  sourceId: string;
  allSegments: TranscriptSegmentData[];
  onClose: () => void;
  onSaved: () => void;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

const NO_SPEAKER = '__none__';
const NEW_SPEAKER = '__new__';

export function SegmentEditDialog({
  segment,
  sourceId,
  allSegments,
  onClose,
  onSaved,
}: SegmentEditDialogProps) {
  const [content, setContent] = useState('');
  const [speakerId, setSpeakerId] = useState<string | null>(null);
  const [newSpeakerName, setNewSpeakerName] = useState('');
  const [showNewSpeakerInput, setShowNewSpeakerInput] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { getDisplayName, renameSpeaker, getCustomSpeakerIds } = useSpeakerNamesContext();

  // Get existing speakers from all segments + custom speakers from project
  const existingSpeakers = useMemo(() => {
    const fromSegments = getUniqueSpeakers(allSegments);
    const segmentSpeakerIds = new Set(fromSegments.map((s) => s.id));

    // Add custom speakers from project that aren't already in segments
    const customIds = getCustomSpeakerIds();
    const customSpeakers = customIds
      .filter((id) => !segmentSpeakerIds.has(id))
      .map((id) => ({ id, ...getSpeakerColor(id) }));

    return [...fromSegments, ...customSpeakers];
  }, [allSegments, getCustomSpeakerIds]);

  // Reset state when segment changes
  useEffect(() => {
    if (segment) {
      setContent(segment.content);
      setSpeakerId(segment.speakerId);
      setNewSpeakerName('');
      setShowNewSpeakerInput(false);
      setError(null);
    }
  }, [segment]);

  const handleSpeakerChange = (value: string) => {
    if (value === NO_SPEAKER) {
      setSpeakerId(null);
      setShowNewSpeakerInput(false);
    } else if (value === NEW_SPEAKER) {
      setShowNewSpeakerInput(true);
    } else {
      setSpeakerId(value);
      setShowNewSpeakerInput(false);
    }
  };

  const handleAddNewSpeaker = () => {
    const trimmed = newSpeakerName.trim();
    if (trimmed) {
      // Create a speaker ID from the name (lowercase, replace spaces with underscores)
      const newId = `speaker_${trimmed.toLowerCase().replace(/\s+/g, '_')}`;
      setSpeakerId(newId);
      // Save the human-readable name to localStorage
      renameSpeaker(newId, trimmed);
      setShowNewSpeakerInput(false);
      setNewSpeakerName('');
    }
  };

  const handleSave = async () => {
    if (!segment) return;

    if (!content.trim()) {
      setError('Content is required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // Build the update payload
      const payload: { content?: string; speakerId?: string | null } = {};

      // Only include content if changed
      if (content.trim() !== segment.content) {
        payload.content = content.trim();
      }

      // Only include speakerId if changed
      if (speakerId !== segment.speakerId) {
        payload.speakerId = speakerId;
      }

      // Don't make API call if nothing changed
      if (Object.keys(payload).length === 0) {
        onClose();
        return;
      }

      const res = await fetch(`/api/sources/${sourceId}/segments/${segment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update segment');
      }

      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update segment');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
    }
  };

  const hasContentChanged = segment && content.trim() !== segment.content;
  const hasSpeakerChanged = segment && speakerId !== segment.speakerId;
  const hasChanged = hasContentChanged || hasSpeakerChanged;

  // Current select value for display
  const selectValue = speakerId ?? NO_SPEAKER;

  return (
    <Dialog open={!!segment} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edit Transcript Segment</DialogTitle>
          <DialogDescription>
            {segment && (
              <span className="text-muted-foreground">
                {formatTime(segment.startTime)} - {formatTime(segment.endTime)}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Speaker selection */}
          <div className="space-y-2">
            <label htmlFor="speaker-select" className="text-sm font-medium">
              Speaker
            </label>
            <div className="flex gap-2">
              <Select value={selectValue} onValueChange={handleSpeakerChange}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select speaker">
                    {speakerId ? (
                      <div className="flex items-center gap-2">
                        <span
                          className="size-3 rounded-sm"
                          style={{ backgroundColor: getSpeakerColor(speakerId).bg }}
                        />
                        <span>{getDisplayName(speakerId)}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">No speaker</span>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_SPEAKER}>
                    <span className="text-muted-foreground">No speaker</span>
                  </SelectItem>
                  {existingSpeakers.map((speaker) => (
                    <SelectItem key={speaker.id} value={speaker.id}>
                      <div className="flex items-center gap-2">
                        <span
                          className="size-3 rounded-sm"
                          style={{ backgroundColor: speaker.bg }}
                        />
                        <span>{getDisplayName(speaker.id)}</span>
                      </div>
                    </SelectItem>
                  ))}
                  <SelectItem value={NEW_SPEAKER}>
                    <div className="text-primary flex items-center gap-2">
                      <Plus className="size-3" />
                      <span>Add new speaker</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* New speaker input */}
            {showNewSpeakerInput && (
              <div className="flex gap-2">
                <Input
                  value={newSpeakerName}
                  onChange={(e) => setNewSpeakerName(e.target.value)}
                  placeholder="Enter speaker name (e.g., John Smith)"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddNewSpeaker();
                    } else if (e.key === 'Escape') {
                      setShowNewSpeakerInput(false);
                      setNewSpeakerName('');
                    }
                  }}
                  autoFocus
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={handleAddNewSpeaker}
                  disabled={!newSpeakerName.trim()}
                >
                  Add
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setShowNewSpeakerInput(false);
                    setNewSpeakerName('');
                  }}
                >
                  <X className="size-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="space-y-2">
            <label htmlFor="segment-content" className="text-sm font-medium">
              Content
            </label>
            <Textarea
              id="segment-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Enter segment content"
              className="min-h-[120px]"
              rows={5}
            />
          </div>

          {error && <p className="text-destructive text-sm">{error}</p>}
          {hasContentChanged && (
            <p className="text-muted-foreground text-sm">
              Search index will be updated in the background after saving.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !content.trim()}>
            {saving ? 'Saving...' : hasChanged ? 'Save' : 'Done'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
