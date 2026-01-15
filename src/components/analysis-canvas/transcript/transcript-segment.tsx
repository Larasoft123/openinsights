'use client';

import { useCallback, useState, useMemo, useRef, useEffect } from 'react';
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
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { EditableNote } from './editable-note';
import { EditableTagList } from './editable-tag-list';
import { TagSelectorModal } from './tag-selector-modal';

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
  projectId?: string;
  allSegments?: TranscriptSegmentData[];
  activeTagFilter?: string | null;
  onEdit?: (segment: TranscriptSegmentData) => void;
  onDelete?: (segment: TranscriptSegmentData) => void;
  onSpeakerChanged?: () => void;
  onSuggestionStatusChange?: (suggestionId: string, status: 'approved' | 'rejected') => void;
  hoveredSuggestionId?: string | null;
  onHoveredSuggestionChange?: (suggestionId: string | null) => void;
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
  projectId,
  allSegments,
  activeTagFilter,
  onEdit,
  onDelete,
  onSpeakerChanged,
  onSuggestionStatusChange,
  hoveredSuggestionId,
  onHoveredSuggestionChange,
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

  // Timer ref for delayed popover close
  const popoverCloseTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Tag selector modal state
  const [tagSelectorOpen, setTagSelectorOpen] = useState(false);
  const [tagSelectorContext, setTagSelectorContext] = useState<{
    type: 'highlight' | 'suggestion';
    id: string;
    currentTags: string[];
  } | null>(null);

  // Processing action state for highlights (note editing, tag operations)
  const [processingHighlight, setProcessingHighlight] = useState<string | null>(null);

  // Auto-focus Approve button when popover is force-hovered (programmatically opened)
  useEffect(() => {
    if (!hoveredSuggestionId) return;

    // Check if this segment has the hovered suggestion
    const hasSuggestion = segment.aiSuggestions?.some((s) => s.id === hoveredSuggestionId);
    if (!hasSuggestion) return;

    // Small delay to ensure popover is rendered
    const timer = setTimeout(() => {
      const approveButton = document.querySelector(
        `[data-suggestion-approve="${hoveredSuggestionId}"]`
      ) as HTMLButtonElement;

      if (approveButton) {
        approveButton.focus();
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [hoveredSuggestionId, segment.aiSuggestions]);

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

  // ============================================
  // HANDLERS: Highlight Editing
  // ============================================

  const handleHighlightNoteSave = useCallback(
    async (highlightId: string, newNote: string | null) => {
      if (!sourceId) return;

      try {
        const res = await fetch(`/api/sources/${sourceId}/highlights/${highlightId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ note: newNote }),
        });

        if (!res.ok) {
          throw new Error('Failed to update highlight note');
        }

        // Trigger refresh to update UI (keep popover open)
        onSpeakerChanged?.();
      } catch (error) {
        console.error('Failed to save highlight note:', error);
        throw error;
      }
    },
    [sourceId, onSpeakerChanged]
  );

  const handleHighlightDeleteTag = useCallback(
    async (highlightId: string) => {
      if (!sourceId) return;

      try {
        const res = await fetch(`/api/sources/${sourceId}/highlights/${highlightId}`, {
          method: 'DELETE',
        });

        if (!res.ok) {
          throw new Error('Failed to delete highlight');
        }

        // Trigger refresh to remove from UI (keep popover open)
        onSpeakerChanged?.();
      } catch (error) {
        console.error('Failed to delete highlight:', error);
        throw error;
      }
    },
    [sourceId, onSpeakerChanged]
  );

  const handleHighlightAddTag = useCallback(
    async (tagId: string) => {
      if (!sourceId || !tagSelectorContext) return;

      const originalHighlightId = tagSelectorContext.id;
      const highlight = segment.highlights?.find((h) => h.id === originalHighlightId);
      if (!highlight) return;

      try {
        // Create new highlight with same note/selectedText but different tag
        const res = await fetch(`/api/sources/${sourceId}/highlights`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            segmentId: segment.id,
            tagId,
            note: highlight.note,
            selectedText: highlight.selectedText,
          }),
        });

        if (!res.ok) {
          throw new Error('Failed to create highlight with new tag');
        }

        // Trigger refresh (keep popover open)
        onSpeakerChanged?.();
      } catch (error) {
        console.error('Failed to add tag to highlight:', error);
        throw error;
      }
    },
    [sourceId, tagSelectorContext, segment, onSpeakerChanged]
  );

  // ============================================
  // HANDLERS: AI Suggestion Editing
  // ============================================

  const handleSuggestionNoteSave = useCallback(
    async (suggestionId: string, newNote: string | null) => {
      if (!sourceId) return;

      try {
        const res = await fetch(`/api/sources/${sourceId}/ai-suggestions/${suggestionId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ aiNote: newNote }),
        });

        if (!res.ok) {
          throw new Error('Failed to update suggestion note');
        }

        // Trigger refresh to update UI (keep popover open)
        onSpeakerChanged?.();
      } catch (error) {
        console.error('Failed to save suggestion note:', error);
        throw error;
      }
    },
    [sourceId, onSpeakerChanged]
  );

  const handleSuggestionDeleteTag = useCallback(
    async (suggestionId: string, tagName: string) => {
      if (!sourceId) return;

      const suggestion = segment.aiSuggestions?.find((s) => s.id === suggestionId);
      if (!suggestion) return;

      const newTagNames = suggestion.tagNames.filter((t) => t !== tagName);

      try {
        const res = await fetch(`/api/sources/${sourceId}/ai-suggestions/${suggestionId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tagNames: newTagNames }),
        });

        if (!res.ok) {
          throw new Error('Failed to update suggestion tags');
        }

        // Trigger refresh (keep popover open)
        onSpeakerChanged?.();
      } catch (error) {
        console.error('Failed to delete tag from suggestion:', error);
        throw error;
      }
    },
    [sourceId, segment.aiSuggestions, onSpeakerChanged]
  );

  const handleSuggestionAddTag = useCallback(
    async (tagId: string, tagName: string) => {
      if (!sourceId || !tagSelectorContext) return;

      const suggestionId = tagSelectorContext.id;
      const suggestion = segment.aiSuggestions?.find((s) => s.id === suggestionId);
      if (!suggestion) return;

      const newTagNames = [...suggestion.tagNames, tagName];

      try {
        const res = await fetch(`/api/sources/${sourceId}/ai-suggestions/${suggestionId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tagNames: newTagNames }),
        });

        if (!res.ok) {
          throw new Error('Failed to add tag to suggestion');
        }

        // Trigger refresh (keep popover open)
        onSpeakerChanged?.();
      } catch (error) {
        console.error('Failed to add tag to suggestion:', error);
        throw error;
      }
    },
    [sourceId, tagSelectorContext, segment.aiSuggestions, onSpeakerChanged]
  );

  // ============================================
  // HANDLERS: Tag Selector Modal
  // ============================================

  const handleAddTagClick = useCallback(
    (type: 'highlight' | 'suggestion', id: string, currentTags: string[]) => {
      setTagSelectorContext({ type, id, currentTags });
      setTagSelectorOpen(true);
    },
    []
  );

  const handleTagSelect = useCallback(
    async (tagId: string, tagName: string) => {
      if (!tagSelectorContext) return;

      if (tagSelectorContext.type === 'highlight') {
        await handleHighlightAddTag(tagId);
      } else {
        await handleSuggestionAddTag(tagId, tagName);
      }

      setTagSelectorOpen(false);
      setTagSelectorContext(null);
    },
    [tagSelectorContext, handleHighlightAddTag, handleSuggestionAddTag]
  );

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

        // Scroll to next suggestion and force-hover popover
        if (nextSegmentWithSuggestions && nextSegmentWithSuggestions.aiSuggestions) {
          const nextElement = document.querySelector(
            `[data-segment-id="${nextSegmentWithSuggestions.id}"]`
          ) as HTMLElement;

          if (nextElement) {
            nextElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }

          // Force-hover the first suggestion in the next segment
          const firstSuggestionId = nextSegmentWithSuggestions.aiSuggestions[0].id;
          setTimeout(() => {
            onHoveredSuggestionChange?.(firstSuggestionId);
          }, 300); // Small delay to allow scroll to complete
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
      onHoveredSuggestionChange,
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

        // Scroll to next suggestion and force-hover popover
        if (nextSegmentWithSuggestions && nextSegmentWithSuggestions.aiSuggestions) {
          const nextElement = document.querySelector(
            `[data-segment-id="${nextSegmentWithSuggestions.id}"]`
          ) as HTMLElement;

          if (nextElement) {
            nextElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }

          // Force-hover the first suggestion in the next segment
          const firstSuggestionId = nextSegmentWithSuggestions.aiSuggestions[0].id;
          setTimeout(() => {
            onHoveredSuggestionChange?.(firstSuggestionId);
          }, 300); // Small delay to allow scroll to complete
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
      onHoveredSuggestionChange,
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

    // Add AI suggestions as inline highlights (text with dashed border)
    // Badges with buttons are rendered separately at the end of the segment
    if (segment.aiSuggestions) {
      for (const suggestion of segment.aiSuggestions) {
        if (!suggestion.selectedText) continue;
        const text = suggestion.selectedText;
        const index = segment.content.indexOf(text);
        if (index !== -1) {
          positions.push({
            start: index,
            end: index + text.length,
            color: suggestion.matchedTags[0]?.color || '#666',
            text,
            type: 'suggestion',
            suggestionId: suggestion.id,
            tags: suggestion.matchedTags,
            note: suggestion.aiNote,
          });
        }
      }
    }

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
        // Saved highlight - render with editable Popover
        const highlightId = pos.highlightId!;
        parts.push(
          <Popover
            key={`highlight-${i}`}
            open={hoveredHighlightId === highlightId}
            onOpenChange={(open) => {
              if (!open) setHoveredHighlightId(null);
            }}
          >
            <PopoverTrigger asChild>
              <mark
                className="cursor-pointer rounded px-0.5"
                style={{ backgroundColor: `${pos.color}40`, color: 'inherit' }}
                onMouseEnter={() => {
                  if (popoverCloseTimerRef.current) {
                    clearTimeout(popoverCloseTimerRef.current);
                    popoverCloseTimerRef.current = null;
                  }
                  setHoveredHighlightId(highlightId);
                }}
                onMouseLeave={() => {
                  popoverCloseTimerRef.current = setTimeout(() => {
                    setHoveredHighlightId(null);
                  }, 200);
                }}
              >
                {pos.text}
              </mark>
            </PopoverTrigger>
            <PopoverContent
              className="w-96 border-gray-700"
              style={{ backgroundColor: '#0a1929' }}
              onClick={(e) => e.stopPropagation()}
              onMouseEnter={() => {
                if (popoverCloseTimerRef.current) {
                  clearTimeout(popoverCloseTimerRef.current);
                  popoverCloseTimerRef.current = null;
                }
                setHoveredHighlightId(highlightId);
              }}
              onMouseLeave={() => {
                popoverCloseTimerRef.current = setTimeout(() => {
                  setHoveredHighlightId(null);
                }, 200);
              }}
              side="top"
              align="start"
            >
              <div className="space-y-3">
                {/* Editable Note */}
                <EditableNote
                  value={pos.note ?? null}
                  onSave={(newNote) => handleHighlightNoteSave(highlightId, newNote)}
                  placeholder="Add note..."
                  disabled={readOnly}
                />

                {/* Editable Tags */}
                <EditableTagList
                  tags={pos.tag ? [pos.tag] : []}
                  onDeleteTag={() => handleHighlightDeleteTag(highlightId)}
                  onAddTag={() =>
                    handleAddTagClick('highlight', highlightId, pos.tag ? [pos.tag.id] : [])
                  }
                  disabled={readOnly}
                />
              </div>
            </PopoverContent>
          </Popover>
        );
      } else {
        // AI suggestion - render highlighted text with Popover on hover
        const suggestionId = pos.suggestionId!;
        parts.push(
          <Popover
            key={`suggestion-${i}`}
            open={hoveredSuggestionId === suggestionId}
            onOpenChange={(open) => {
              console.log('Popover onOpenChange:', open, suggestionId);
              if (!open) onHoveredSuggestionChange?.(null);
            }}
          >
            <PopoverTrigger asChild>
              <mark
                className="cursor-pointer rounded border-2 border-dashed px-0.5"
                style={{
                  backgroundColor: `${pos.color}20`,
                  borderColor: `${pos.color}60`,
                  color: 'inherit',
                }}
                onMouseEnter={() => {
                  console.log('Mouse enter suggestion:', suggestionId);
                  // Cancel any pending close timer
                  if (popoverCloseTimerRef.current) {
                    clearTimeout(popoverCloseTimerRef.current);
                    popoverCloseTimerRef.current = null;
                  }
                  onHoveredSuggestionChange?.(suggestionId);
                }}
                onMouseLeave={() => {
                  console.log('Mouse leave suggestion:', suggestionId);
                  // Delay closing to allow smooth transition to popover
                  popoverCloseTimerRef.current = setTimeout(() => {
                    onHoveredSuggestionChange?.(null);
                  }, 200);
                }}
              >
                {pos.text}
              </mark>
            </PopoverTrigger>
            <PopoverContent
              className="w-96 border-blue-900"
              style={{ backgroundColor: '#0a1929' }}
              onClick={(e) => e.stopPropagation()}
              onMouseEnter={() => {
                console.log('Mouse enter popover content:', suggestionId);
                // Cancel any pending close timer
                if (popoverCloseTimerRef.current) {
                  clearTimeout(popoverCloseTimerRef.current);
                  popoverCloseTimerRef.current = null;
                }
                onHoveredSuggestionChange?.(suggestionId);
              }}
              onMouseLeave={() => {
                console.log('Mouse leave popover content:', suggestionId);
                // Delay closing
                popoverCloseTimerRef.current = setTimeout(() => {
                  onHoveredSuggestionChange?.(null);
                }, 200);
              }}
              side="top"
              align="start"
            >
              <div className="flex items-start gap-3">
                {/* Editable Content: Note + Tags */}
                <div className="flex-1 space-y-3">
                  {/* Editable Note */}
                  <EditableNote
                    value={pos.note ?? null}
                    onSave={(newNote) => handleSuggestionNoteSave(suggestionId, newNote)}
                    placeholder="Add note..."
                    disabled={readOnly}
                  />

                  {/* Editable Tags */}
                  <EditableTagList
                    tags={pos.tags || []}
                    onDeleteTag={async (tagId) => {
                      const tag = pos.tags?.find((t) => t.id === tagId);
                      if (tag) {
                        await handleSuggestionDeleteTag(suggestionId, tag.name);
                      }
                    }}
                    onAddTag={() => {
                      const currentTagNames = pos.tags?.map((t) => t.name) || [];
                      handleAddTagClick('suggestion', suggestionId, currentTagNames);
                    }}
                    disabled={readOnly}
                  />
                </div>

                {/* Actions - icon only buttons on the right */}
                <div className="flex shrink-0 gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => handleApproveSuggestion(pos.suggestionId!, e)}
                    disabled={processingAction === pos.suggestionId}
                    className="h-auto p-2 text-gray-300 hover:bg-gray-800 hover:text-white"
                    data-suggestion-approve={pos.suggestionId}
                  >
                    <Check className="size-6" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => handleRejectSuggestion(pos.suggestionId!, e)}
                    disabled={processingAction === pos.suggestionId}
                    className="h-auto p-2 text-gray-300 hover:bg-gray-800 hover:text-white"
                  >
                    <X className="size-6" />
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
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
    hoveredSuggestionId,
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
      </div>

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

      {/* Tag Selector Modal */}
      {projectId && (
        <TagSelectorModal
          open={tagSelectorOpen}
          onClose={() => {
            setTagSelectorOpen(false);
            setTagSelectorContext(null);
          }}
          onSelectTag={handleTagSelect}
          projectId={projectId}
          currentTags={tagSelectorContext?.currentTags || []}
          excludeByName={tagSelectorContext?.type === 'suggestion'}
        />
      )}
    </div>
  );
}
