'use client';

import { useState, useMemo } from 'react';
import { Users, Pencil, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getSpeakerColor, getUniqueSpeakers } from '@/lib/utils/speaker-colors';
import { useSpeakerNamesContext } from './speaker-names-context';
import { TranscriptSegmentData } from './transcript-segment';

interface SpeakerFilterProps {
  segments: TranscriptSegmentData[];
  selectedSpeakers: Set<string> | null; // null = all speakers
  onSelectionChange: (speakers: Set<string> | null) => void;
}

/**
 * SpeakerFilter Component
 *
 * Dropdown to filter transcript by speaker(s).
 * Allows multi-select with "All" option.
 */
export function SpeakerFilter({
  segments,
  selectedSpeakers,
  onSelectionChange,
}: SpeakerFilterProps) {
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [showAddNew, setShowAddNew] = useState(false);
  const [newSpeakerName, setNewSpeakerName] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  // Speaker name management (from context - project-scoped)
  const { getDisplayName, renameSpeaker, getCustomSpeakerIds } = useSpeakerNamesContext();

  // Get unique speakers with colors (from segments + custom from project)
  const speakers = useMemo(() => {
    const fromSegments = getUniqueSpeakers(segments);
    const segmentSpeakerIds = new Set(fromSegments.map((s) => s.id));

    // Add custom speakers from project that aren't already in segments
    const customIds = getCustomSpeakerIds();
    const customSpeakers = customIds
      .filter((id) => !segmentSpeakerIds.has(id))
      .map((id) => ({ id, ...getSpeakerColor(id) }));

    return [...fromSegments, ...customSpeakers];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segments, getCustomSpeakerIds, refreshKey]);

  // No speakers = no diarization data
  if (speakers.length === 0) {
    return null;
  }

  const allSelected = selectedSpeakers === null;
  const someSelected = selectedSpeakers !== null && selectedSpeakers.size > 0;
  const selectedCount = selectedSpeakers?.size ?? speakers.length;

  const handleToggleSpeaker = (speakerId: string) => {
    if (selectedSpeakers === null) {
      // Currently "all" - switch to all except this one
      const newSet = new Set(speakers.map((s) => s.id));
      newSet.delete(speakerId);
      onSelectionChange(newSet.size > 0 ? newSet : null);
    } else if (selectedSpeakers.has(speakerId)) {
      // Remove this speaker
      const newSet = new Set(selectedSpeakers);
      newSet.delete(speakerId);
      // If empty, revert to "all"
      onSelectionChange(newSet.size > 0 ? newSet : null);
    } else {
      // Add this speaker
      const newSet = new Set(selectedSpeakers);
      newSet.add(speakerId);
      // If all selected, set to null (all)
      onSelectionChange(newSet.size === speakers.length ? null : newSet);
    }
  };

  const handleSelectAll = () => {
    onSelectionChange(null);
  };

  const isSpeakerSelected = (speakerId: string) => {
    return selectedSpeakers === null || selectedSpeakers.has(speakerId);
  };

  const handleStartEdit = (speakerId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingId(speakerId);
    setEditValue(getDisplayName(speakerId));
  };

  const handleSaveEdit = () => {
    if (editingId) {
      renameSpeaker(editingId, editValue);
      setEditingId(null);
      setEditValue('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      setEditingId(null);
      setEditValue('');
    }
  };

  const handleAddNewSpeaker = () => {
    const trimmed = newSpeakerName.trim();
    if (trimmed) {
      // Create a speaker ID from the name (lowercase, replace spaces with underscores)
      const newId = `speaker_${trimmed.toLowerCase().replace(/\s+/g, '_')}`;
      // Save the human-readable name to localStorage
      renameSpeaker(newId, trimmed);
      setShowAddNew(false);
      setNewSpeakerName('');
      // Trigger re-render to show the new speaker in the list
      setRefreshKey((k) => k + 1);
    }
  };

  const handleNewSpeakerKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddNewSpeaker();
    } else if (e.key === 'Escape') {
      setShowAddNew(false);
      setNewSpeakerName('');
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ${
            someSelected && !allSelected
              ? 'bg-accent-primary text-white shadow-lg'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
          }`}
        >
          <Users size={16} strokeWidth={1.5} />
          {allSelected
            ? 'All Speakers'
            : `${selectedCount} Speaker${selectedCount !== 1 ? 's' : ''}`}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Filter by Speaker</span>
          {!allSelected && (
            <button
              onClick={handleSelectAll}
              className="text-muted-foreground hover:text-foreground text-xs"
            >
              Reset
            </button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {speakers.map((speaker) => (
          <div key={speaker.id} className="relative">
            {editingId === speaker.id ? (
              <div className="flex items-center gap-2 px-2 py-1.5">
                <span
                  className="size-3 shrink-0 rounded-sm"
                  style={{ backgroundColor: speaker.bg }}
                />
                <Input
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onBlur={handleSaveEdit}
                  className="h-6 flex-1 text-sm"
                  autoFocus
                />
              </div>
            ) : (
              <DropdownMenuCheckboxItem
                checked={isSpeakerSelected(speaker.id)}
                onCheckedChange={() => handleToggleSpeaker(speaker.id)}
                onSelect={(e) => e.preventDefault()}
                className="group gap-2 pr-8"
              >
                <span
                  className="size-3 shrink-0 rounded-sm"
                  style={{ backgroundColor: speaker.bg }}
                />
                <span className="flex-1 truncate">{getDisplayName(speaker.id)}</span>
                <button
                  onClick={(e) => handleStartEdit(speaker.id, e)}
                  className="text-muted-foreground hover:text-foreground absolute right-2 opacity-0 transition-opacity group-hover:opacity-100"
                  title="Rename speaker"
                >
                  <Pencil className="size-3" />
                </button>
              </DropdownMenuCheckboxItem>
            )}
          </div>
        ))}

        <DropdownMenuSeparator />

        {/* Add new speaker */}
        {showAddNew ? (
          <div className="flex items-center gap-2 px-2 py-1.5">
            <Input
              value={newSpeakerName}
              onChange={(e) => setNewSpeakerName(e.target.value)}
              onKeyDown={handleNewSpeakerKeyDown}
              placeholder="Speaker name"
              className="h-6 flex-1 text-sm"
              autoFocus
            />
            <Button
              size="sm"
              className="h-6 px-2"
              onClick={handleAddNewSpeaker}
              disabled={!newSpeakerName.trim()}
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
            className="text-primary hover:bg-muted flex w-full items-center gap-2 px-2 py-1.5 text-sm"
          >
            <Plus className="size-4" />
            Add new speaker
          </button>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
