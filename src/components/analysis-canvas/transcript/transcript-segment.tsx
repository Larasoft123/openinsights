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
    selectedText?: string | null;
    note?: string | null;
    tag: {
      id: string;
      name: string;
      color: string;
    };
  }>;
  aiSuggestions?: Array<{
    id: string;
    tagNames: string[];
    selectedText: string | null;
    confidence: number | null;
    aiNote: string | null;
    status?: 'pending' | 'approved' | 'rejected';
    matchedTags: Array<{
      id: string;
      name: string;
      color: string;
    }>;
  }>;
}

interface TranscriptSegmentProps {
  segment: TranscriptSegmentData;
  isActive: boolean;
  style?: React.CSSProperties;
  sourceId?: string;
  allSegments?: TranscriptSegmentData[];
  activeTagFilter?: string | null;
  onEdit?: (segment: TranscriptSegmentData) => void;
  onDelete?: (segment: TranscriptSegmentData) => void;
  onSpeakerChanged?: () => void;
  onSuggestionStatusChange?: (suggestionId: string, status: 'approved' | 'rejected') => void;
  readOnly?: boolean;
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
  activeTagFilter,
  onEdit,
  onDelete,
  onSpeakerChanged,
  onSuggestionStatusChange,
  readOnly = false,
}: TranscriptSegmentProps) {
  const seekTo = useVideoPlayerStore((state) => state.seekTo);
  const { getDisplayName, renameSpeaker, getCustomSpeakerIds } = useSpeakerNamesContext();

  // Speaker dropdown state
  const [speakerDropdownOpen, setSpeakerDropdownOpen] = useState(false);
  const [showAddNew, setShowAddNew] = useState(false);
  const [newSpeakerName, setNewSpeakerName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Track hovered highlight ID for showing tag badges
  const [hoveredHighlightId, setHoveredHighlightId] = useState<string | null>(null);

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

  // Handle AI suggestion actions
  const [processingAction, setProcessingAction] = useState<string | null>(null);

  const handleApproveSuggestion = useCallback(
    async (suggestionId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (!sourceId || processingAction || !allSegments) return;

      // Find next segment with AI suggestions before approving
      const currentIndex = allSegments.findIndex((s) => s.id === segment.id);
      const segmentsAfter = allSegments.slice(currentIndex + 1);
      const nextSegmentWithSuggestions = segmentsAfter.find(
        (s) => s.aiSuggestions && s.aiSuggestions.length > 0
      );

      setProcessingAction(suggestionId);
      try {
        const res = await fetch(`/api/sources/${sourceId}/ai-suggestions/${suggestionId}/approve`, {
          method: 'POST',
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to approve suggestion');
        }

        // Update local state immediately for instant UI update
        onSuggestionStatusChange?.(suggestionId, 'approved');

        // Scroll to next suggestion before refresh
        if (nextSegmentWithSuggestions) {
          const nextElement = document.querySelector(
            `[data-segment-id="${nextSegmentWithSuggestions.id}"]`
          ) as HTMLElement;

          if (nextElement) {
            nextElement.scrollIntoView({ behavior: 'smooth', block: 'center' });

            // Force hover state on badge suggestion groups
            const badgeSuggestionGroups = nextElement.querySelectorAll('.group\\/tag-suggestion');

            badgeSuggestionGroups.forEach((group) => {
              group.classList.add('force-hover-tag-suggestion');
            });

            // Remove force-hover after 3 seconds
            setTimeout(() => {
              badgeSuggestionGroups.forEach((group) => {
                group.classList.remove('force-hover-tag-suggestion');
              });
            }, 3000);
          }
        }

        // Trigger refresh to update UI
        onSpeakerChanged?.();
      } catch (error) {
        console.error('Failed to approve suggestion:', error);
      } finally {
        setProcessingAction(null);
      }
    },
    [
      sourceId,
      processingAction,
      onSpeakerChanged,
      onSuggestionStatusChange,
      allSegments,
      segment.id,
    ]
  );

  const handleRejectSuggestion = useCallback(
    async (suggestionId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (!sourceId || processingAction || !allSegments) return;

      // Find next segment with AI suggestions before rejecting
      const currentIndex = allSegments.findIndex((s) => s.id === segment.id);
      const segmentsAfter = allSegments.slice(currentIndex + 1);
      const nextSegmentWithSuggestions = segmentsAfter.find(
        (s) => s.aiSuggestions && s.aiSuggestions.length > 0
      );

      setProcessingAction(suggestionId);
      try {
        const res = await fetch(`/api/sources/${sourceId}/ai-suggestions/${suggestionId}/reject`, {
          method: 'POST',
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to reject suggestion');
        }

        // Update local state immediately for instant UI update
        onSuggestionStatusChange?.(suggestionId, 'rejected');

        // Scroll to next suggestion before refresh
        if (nextSegmentWithSuggestions) {
          const nextElement = document.querySelector(
            `[data-segment-id="${nextSegmentWithSuggestions.id}"]`
          ) as HTMLElement;

          if (nextElement) {
            nextElement.scrollIntoView({ behavior: 'smooth', block: 'center' });

            // Force hover state on badge suggestion groups
            const badgeSuggestionGroups = nextElement.querySelectorAll('.group\\/tag-suggestion');

            badgeSuggestionGroups.forEach((group) => {
              group.classList.add('force-hover-tag-suggestion');
            });

            // Remove force-hover after 3 seconds
            setTimeout(() => {
              badgeSuggestionGroups.forEach((group) => {
                group.classList.remove('force-hover-tag-suggestion');
              });
            }, 3000);
          }
        }

        // Trigger refresh to update UI
        onSpeakerChanged?.();
      } catch (error) {
        console.error('Failed to reject suggestion:', error);
      } finally {
        setProcessingAction(null);
      }
    },
    [
      sourceId,
      processingAction,
      onSpeakerChanged,
      onSuggestionStatusChange,
      allSegments,
      segment.id,
    ]
  );

  // Render content with highlighted text and AI suggestions
  const renderedContent = useMemo(() => {
    const hasHighlights = segment.highlights && segment.highlights.length > 0;
    const hasSuggestions = segment.aiSuggestions && segment.aiSuggestions.length > 0;

    if (!hasHighlights && !hasSuggestions) {
      return segment.content;
    }

    // Get highlights to render (filter by active tag if set)
    const highlightsToRender =
      hasHighlights && activeTagFilter
        ? segment.highlights!.filter((h) => h.tag.id === activeTagFilter)
        : segment.highlights || [];

    // Get highlights with selectedText
    const highlightsWithText = highlightsToRender.filter((h) => h.selectedText);

    // Build positions array for both highlights and AI suggestions
    const positions: Array<{
      start: number;
      end: number;
      color: string;
      text: string;
      type: 'highlight' | 'suggestion';
      highlightId?: string;
      suggestionId?: string;
      tag?: { id: string; name: string; color: string };
      tags?: Array<{ id: string; name: string; color: string }>;
      confidence?: number | null;
      note?: string | null;
    }> = [];

    // Add confirmed highlights
    for (const highlight of highlightsWithText) {
      const text = highlight.selectedText!;
      const index = segment.content.indexOf(text);
      if (index !== -1) {
        positions.push({
          start: index,
          end: index + text.length,
          color: highlight.tag.color,
          text,
          type: 'highlight',
          highlightId: highlight.id,
          tag: highlight.tag,
          note: highlight.note,
        });
      }
    }

    // AI suggestions are always rendered as badges (not inline), so skip adding them to positions
    // This prevents buttons from appearing in the middle of text

    // If no positions with text, return plain content
    if (positions.length === 0) {
      return segment.content;
    }

    // Sort by start position
    positions.sort((a, b) => a.start - b.start);

    // Remove overlapping highlights (keep first occurrence)
    const nonOverlapping: typeof positions = [];
    for (const pos of positions) {
      const lastEnd = nonOverlapping.length > 0 ? nonOverlapping[nonOverlapping.length - 1].end : 0;
      if (pos.start >= lastEnd) {
        nonOverlapping.push(pos);
      }
    }

    // Build JSX with highlighted spans
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;

    for (let i = 0; i < nonOverlapping.length; i++) {
      const pos = nonOverlapping[i];

      // Add text before highlight
      if (pos.start > lastIndex) {
        parts.push(segment.content.slice(lastIndex, pos.start));
      }

      // Add highlighted text
      if (pos.type === 'highlight') {
        parts.push(
          <span
            key={`highlight-${i}`}
            className="inline"
            onMouseEnter={() => setHoveredHighlightId(pos.highlightId!)}
            onMouseLeave={() => setHoveredHighlightId(null)}
          >
            <mark
              className="cursor-pointer rounded px-0.5"
              style={{ backgroundColor: `${pos.color}40`, color: 'inherit' }}
              title={pos.note || undefined}
            >
              {pos.text}
            </mark>
          </span>
        );
      } else {
        // AI suggestion - render with distinct styling and action buttons
        parts.push(
          <span
            key={`suggestion-${i}`}
            className="group/suggestion relative inline-flex items-baseline gap-1"
          >
            <mark
              className="rounded border-2 border-dashed px-0.5"
              style={{
                backgroundColor: `${pos.color}20`,
                borderColor: `${pos.color}60`,
                color: 'inherit',
              }}
              title={pos.note || undefined}
            >
              {pos.text}
            </mark>
            <span className="inline-flex items-center gap-1.5 opacity-0 transition-opacity group-hover/suggestion:opacity-100 group-[.force-hover-suggestion]/suggestion:opacity-100">
              {/* Tag badges */}
              <span className="inline-flex gap-1">
                {pos.tags?.map((tag) => (
                  <span
                    key={tag.id}
                    className="rounded px-1.5 py-0.5 text-xs font-medium"
                    style={{
                      backgroundColor: `${tag.color}30`,
                      color: tag.color,
                    }}
                  >
                    {tag.name}
                  </span>
                ))}
              </span>
              {/* Action buttons */}
              <span className="inline-flex gap-0.5">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 hover:bg-green-600 hover:text-white"
                  onClick={(e) => handleApproveSuggestion(pos.suggestionId!, e)}
                  disabled={processingAction === pos.suggestionId}
                  title="Approve suggestion"
                >
                  <Check className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 hover:bg-red-600 hover:text-white"
                  onClick={(e) => handleRejectSuggestion(pos.suggestionId!, e)}
                  disabled={processingAction === pos.suggestionId}
                  title="Reject suggestion"
                >
                  <X className="size-4" />
                </Button>
              </span>
            </span>
          </span>
        );
      }

      lastIndex = pos.end;
    }

    // Add remaining text after last highlight
    if (lastIndex < segment.content.length) {
      parts.push(segment.content.slice(lastIndex));
    }

    return parts;
  }, [
    segment.content,
    segment.highlights,
    segment.aiSuggestions,
    activeTagFilter,
    processingAction,
    handleApproveSuggestion,
    handleRejectSuggestion,
  ]);

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

      {/* Speaker badge with inline editing (editable only when not readOnly) */}
      {sourceId && segment.speakerId && !readOnly ? (
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
        // Static badge when readOnly or inline editing not available
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

      {/* Content + Tag badges grouped together */}
      <div className="flex flex-1 flex-wrap items-center gap-2">
        {/* Content */}
        <span className={cn('text-sm leading-relaxed text-gray-300', isActive && 'text-white')}>
          {renderedContent}
        </span>

        {/* Tag badges - shown on hover (all badges shown when any highlight is hovered) */}
        {hasHighlights && hoveredHighlightId && (
          <div className="flex items-center gap-1">
            {segment.highlights!.map((highlight) => (
              <div
                key={highlight.id}
                className="flex items-center gap-1.5 rounded border border-solid px-2 py-1"
                style={{
                  borderColor: highlight.tag.color,
                  backgroundColor: `${highlight.tag.color}10`,
                }}
                title={highlight.note || undefined}
              >
                <span className="text-xs font-medium" style={{ color: highlight.tag.color }}>
                  {highlight.tag.name}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tag indicators - confirmed highlights (dots) */}
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

      {/* AI suggestion indicators - all AI suggestions rendered as badges */}
      {segment.aiSuggestions && segment.aiSuggestions.length > 0 && !readOnly && (
        <div className="flex shrink-0 items-center gap-1">
          {segment.aiSuggestions.map((suggestion) => (
            <div
              key={suggestion.id}
              className="group/tag-suggestion flex items-center gap-1.5 rounded border border-dashed px-2 py-1"
              style={{
                borderColor: suggestion.matchedTags[0]?.color || '#666',
                backgroundColor: `${suggestion.matchedTags[0]?.color || '#666'}10`,
              }}
              title={
                suggestion.aiNote ||
                `AI suggested: ${suggestion.matchedTags.map((t) => t.name).join(', ')}`
              }
            >
              <span className="text-xs font-medium text-gray-400">
                {suggestion.matchedTags.map((t) => t.name).join(', ')}
              </span>
              <span className="flex gap-0.5 opacity-0 transition-opacity group-hover/tag-suggestion:opacity-100 group-[.force-hover-tag-suggestion]/tag-suggestion:opacity-100">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 hover:bg-green-600 hover:text-white"
                  onClick={(e) => handleApproveSuggestion(suggestion.id, e)}
                  disabled={processingAction === suggestion.id}
                  title="Approve suggestion"
                >
                  <Check className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 hover:bg-red-600 hover:text-white"
                  onClick={(e) => handleRejectSuggestion(suggestion.id, e)}
                  disabled={processingAction === suggestion.id}
                  title="Reject suggestion"
                >
                  <X className="size-4" />
                </Button>
              </span>
            </div>
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
