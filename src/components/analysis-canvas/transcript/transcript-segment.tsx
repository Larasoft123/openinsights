'use client';

import { useCallback, useState, useMemo } from 'react';
import { MoreVertical, Pencil, Trash2, Plus, X, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getSpeakerColor, getUniqueSpeakers } from '@/lib/utils/speaker-colors';
import { formatTime, useVideoPlayerStore } from '@/lib/stores/video-player-store';
import { useSpeakerNamesContext } from './speaker-names-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

/**
 * Transcript Segment Types
 *
 * Matches the TranscriptSegment Prisma model fields used in display
 */
export interface TranscriptSegmentData {
  id: string;
  content: string;
  startTime: number;
  endTime: number;
  speakerId: string | null;
  highlights?: Array<{
    id: string;
    tag: {
      id: string;
      name: string;
      color: string;
    };
  }>;
}

interface TranscriptSegmentProps {
  segment: TranscriptSegmentData;
  isActive: boolean;
  style?: React.CSSProperties;
  sourceId?: string;
  allSegments?: TranscriptSegmentData[];
  onEdit?: (segment: TranscriptSegmentData) => void;
  onDelete?: (segment: TranscriptSegmentData) => void;
  onSpeakerChanged?: () => void;
}

/**
 * TranscriptSegment Component
 *
 * Renders a single transcript segment with:
 * - Timestamp (click-to-seek)
 * - Speaker ID (if available)
 * - Content text
 * - Active state highlighting
 * - Tag indicators for highlighted segments
 */
export function TranscriptSegment({
  segment,
  isActive,
  style,
  sourceId,
  allSegments,
  onEdit,
  onDelete,
  onSpeakerChanged,
}: TranscriptSegmentProps) {
  const seekTo = useVideoPlayerStore((state) => state.seekTo);
  const { getDisplayName, renameSpeaker, getCustomSpeakerIds } = useSpeakerNamesContext();

  // Speaker dropdown state
  const [speakerDropdownOpen, setSpeakerDropdownOpen] = useState(false);
  const [showAddNew, setShowAddNew] = useState(false);
  const [newSpeakerName, setNewSpeakerName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Get all available speakers (from segments + project custom speakers)
  const availableSpeakers = useMemo(() => {
    if (!allSegments || !sourceId) return [];

    const fromSegments = getUniqueSpeakers(allSegments);
    const segmentSpeakerIds = new Set(fromSegments.map((s) => s.id));

    // Add custom speakers from project that aren't already in segments
    const customIds = getCustomSpeakerIds();
    const customSpeakers = customIds
      .filter((id) => !segmentSpeakerIds.has(id))
      .map((id) => ({ id, ...getSpeakerColor(id) }));

    return [...fromSegments, ...customSpeakers];
  }, [allSegments, sourceId, getCustomSpeakerIds]);

  // Click-to-seek: Jump to segment start time
  const handleClick = useCallback(() => {
    seekTo(segment.startTime);
  }, [seekTo, segment.startTime]);

  // Keyboard accessibility: Allow Enter/Space to trigger seek
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        seekTo(segment.startTime);
      }
    },
    [seekTo, segment.startTime]
  );

  const hasHighlights = segment.highlights && segment.highlights.length > 0;

  // Handle speaker change via API
  const handleSpeakerChange = useCallback(
    async (newSpeakerId: string | null) => {
      if (!sourceId || isSaving) return;
      if (newSpeakerId === segment.speakerId) {
        setSpeakerDropdownOpen(false);
        return;
      }

      setIsSaving(true);
      try {
        const res = await fetch(`/api/sources/${sourceId}/segments/${segment.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ speakerId: newSpeakerId }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to update speaker');
        }

        setSpeakerDropdownOpen(false);
        onSpeakerChanged?.();
      } catch (error) {
        console.error('Failed to update speaker:', error);
      } finally {
        setIsSaving(false);
      }
    },
    [sourceId, segment.id, segment.speakerId, isSaving, onSpeakerChanged]
  );

  // Handle adding a new speaker
  const handleAddNewSpeaker = useCallback(async () => {
    const trimmed = newSpeakerName.trim();
    if (!trimmed || !sourceId) return;

    // Create speaker ID from name
    const newId = `speaker_${trimmed.toLowerCase().replace(/\s+/g, '_')}`;
    // Save display name to localStorage
    renameSpeaker(newId, trimmed);

    // Assign to segment
    await handleSpeakerChange(newId);
    setShowAddNew(false);
    setNewSpeakerName('');
  }, [newSpeakerName, sourceId, renameSpeaker, handleSpeakerChange]);

  return (
    <div
      role="button"
      tabIndex={0}
      data-segment-id={segment.id}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      style={style}
      className={cn(
        'group flex cursor-pointer gap-3 px-4 py-3 transition-colors',
        'hover:bg-gray-800 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none focus-visible:ring-inset',
        isActive && 'border-l-2 border-l-blue-500 bg-blue-500/10'
      )}
    >
      {/* Timestamp */}
      <span
        className={cn(
          'shrink-0 font-mono text-xs tabular-nums',
          isActive ? 'font-medium text-blue-400' : 'text-gray-400'
        )}
      >
        {formatTime(segment.startTime)}
      </span>

      {/* Speaker badge with inline editing */}
      {sourceId && segment.speakerId ? (
        <DropdownMenu open={speakerDropdownOpen} onOpenChange={setSpeakerDropdownOpen}>
          <DropdownMenuTrigger asChild>
            <button
              onClick={(e) => e.stopPropagation()}
              disabled={isSaving}
              className={cn(
                'shrink-0 rounded px-1.5 py-0.5 text-xs font-medium transition-opacity',
                'focus:ring-ring hover:opacity-80 focus:ring-2 focus:outline-none',
                isSaving && 'opacity-50'
              )}
              style={{
                backgroundColor: getSpeakerColor(segment.speakerId).bg,
                color: getSpeakerColor(segment.speakerId).text,
              }}
            >
              {getDisplayName(segment.speakerId)}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48" onClick={(e) => e.stopPropagation()}>
            {/* Current speaker indicator */}
            {availableSpeakers.map((speaker) => (
              <DropdownMenuItem
                key={speaker.id}
                onClick={() => handleSpeakerChange(speaker.id)}
                className="gap-2"
              >
                <span
                  className="size-3 shrink-0 rounded-sm"
                  style={{ backgroundColor: speaker.bg }}
                />
                <span className="flex-1 truncate">{getDisplayName(speaker.id)}</span>
                {speaker.id === segment.speakerId && <Check className="size-3 shrink-0" />}
              </DropdownMenuItem>
            ))}

            <DropdownMenuSeparator />

            {/* Remove speaker option */}
            <DropdownMenuItem onClick={() => handleSpeakerChange(null)} className="text-gray-400">
              No speaker
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            {/* Add new speaker */}
            {showAddNew ? (
              <div
                className="flex items-center gap-2 px-2 py-1.5"
                onClick={(e) => e.stopPropagation()}
              >
                <Input
                  value={newSpeakerName}
                  onChange={(e) => setNewSpeakerName(e.target.value)}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddNewSpeaker();
                    } else if (e.key === 'Escape') {
                      setShowAddNew(false);
                      setNewSpeakerName('');
                    }
                  }}
                  placeholder="Speaker name"
                  className="h-6 flex-1 text-sm"
                  autoFocus
                />
                <Button
                  size="sm"
                  className="h-6 px-2"
                  onClick={handleAddNewSpeaker}
                  disabled={!newSpeakerName.trim() || isSaving}
                >
                  Add
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                  onClick={() => {
                    setShowAddNew(false);
                    setNewSpeakerName('');
                  }}
                >
                  <X className="size-3" />
                </Button>
              </div>
            ) : (
              <button
                onClick={() => setShowAddNew(true)}
                className="flex w-full items-center gap-2 px-2 py-1.5 text-sm text-blue-400 hover:bg-gray-800"
              >
                <Plus className="size-4" />
                Add new speaker
              </button>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : segment.speakerId ? (
        // Static badge when inline editing not available
        <span
          className="shrink-0 rounded px-1.5 py-0.5 text-xs font-medium"
          style={{
            backgroundColor: getSpeakerColor(segment.speakerId).bg,
            color: getSpeakerColor(segment.speakerId).text,
          }}
        >
          {getDisplayName(segment.speakerId)}
        </span>
      ) : null}

      {/* Content */}
      <span
        className={cn('flex-1 text-sm leading-relaxed text-gray-300', isActive && 'text-white')}
      >
        {segment.content}
      </span>

      {/* Tag indicators */}
      {hasHighlights && (
        <div className="flex shrink-0 items-center gap-1">
          {segment.highlights!.map((highlight) => (
            <span
              key={highlight.id}
              className="size-2 rounded-full"
              style={{ backgroundColor: highlight.tag.color }}
              title={highlight.tag.name}
            />
          ))}
        </div>
      )}

      {/* Action menu */}
      {(onEdit || onDelete) && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'size-6 shrink-0 p-0 opacity-0 transition-opacity',
                'group-hover:opacity-100 focus:opacity-100'
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="size-4" />
              <span className="sr-only">Segment actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onEdit && (
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(segment);
                }}
              >
                <Pencil className="mr-2 size-4" />
                Edit segment
              </DropdownMenuItem>
            )}
            {onEdit && onDelete && <DropdownMenuSeparator />}
            {onDelete && (
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(segment);
                }}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 size-4" />
                Delete segment
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
