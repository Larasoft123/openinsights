'use client';

import { useState, useRef, useEffect } from 'react';
import { Loader2, Pencil } from 'lucide-react';

interface EditableNoteProps {
  value: string | null;
  onSave: (newValue: string | null) => Promise<void>;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * EditableNote Component
 *
 * Editable textarea with autosave functionality.
 * - Autosaves on blur (after 100ms delay)
 * - Enter (without Shift) to save immediately
 * - Escape to cancel editing
 * - Shows loading spinner while saving
 * - Only saves if value actually changed
 */
export function EditableNote({
  value,
  onSave,
  placeholder = 'Add note...',
  disabled = false,
  className = '',
}: EditableNoteProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value || '');
  const [isSaving, setIsSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Update editValue when value prop changes (e.g., after save)
  useEffect(() => {
    if (!isEditing) {
      setEditValue(value || '');
    }
  }, [value, isEditing]);

  // Auto-resize textarea to fit content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [editValue, isEditing]);

  const handleSave = async () => {
    const trimmed = editValue.trim();
    const originalValue = value || '';

    console.log('[DEBUG] EditableNote handleSave called:', {
      editValue,
      trimmed,
      originalValue,
      valueChanged: trimmed !== originalValue,
    });

    // Only save if value changed
    if (trimmed !== originalValue) {
      console.log('[DEBUG] EditableNote: Value changed, calling onSave');
      setIsSaving(true);
      try {
        await onSave(trimmed || null);
        console.log('[DEBUG] EditableNote: onSave completed successfully');
      } catch (error) {
        console.error('[DEBUG] EditableNote: Failed to save note:', error);
        // Revert to original value on error
        setEditValue(originalValue);
      } finally {
        setIsSaving(false);
      }
    } else {
      console.log('[DEBUG] EditableNote: Value unchanged, skipping save');
    }

    setIsEditing(false);
  };

  const handleCancel = () => {
    console.log('[DEBUG] EditableNote handleCancel called');
    setEditValue(value || '');
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    console.log('[DEBUG] EditableNote handleKeyDown:', e.key);

    // Prevent space from triggering video player play/pause
    if (e.key === ' ') {
      e.stopPropagation();
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      console.log('[DEBUG] EditableNote: Enter pressed, calling handleSave');
      void handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      console.log('[DEBUG] EditableNote: Escape pressed, calling handleCancel');
      handleCancel();
    }
  };

  const handleFocus = () => {
    console.log('[DEBUG] EditableNote handleFocus called, entering edit mode');
    setIsEditing(true);
  };

  const handleBlur = () => {
    console.log('[DEBUG] EditableNote handleBlur called');
    // Small delay to allow clicking on other elements
    setTimeout(() => {
      if (isEditing) {
        console.log('[DEBUG] EditableNote: Blur timeout fired, calling handleSave');
        void handleSave();
      }
    }, 100);
  };

  if (!isEditing && !value) {
    // Show placeholder as clickable text
    return (
      <button
        onClick={() => {
          console.log('[DEBUG] EditableNote: Placeholder clicked, entering edit mode');
          setIsEditing(true);
        }}
        className={`group flex w-full items-center gap-1.5 text-left text-sm text-gray-400 hover:text-gray-300 ${className}`}
        disabled={disabled}
      >
        {placeholder}
        <Pencil className="size-3 opacity-50 group-hover:opacity-100" />
      </button>
    );
  }

  if (!isEditing) {
    // Show note value as clickable text
    return (
      <div
        onClick={() => {
          if (!disabled) {
            console.log('[DEBUG] EditableNote: Note text clicked, entering edit mode');
            setIsEditing(true);
          }
        }}
        className={`group flex cursor-pointer items-start gap-1.5 text-sm text-gray-300 hover:text-white ${className}`}
      >
        <span className="flex-1 whitespace-pre-wrap">{value}</span>
        <Pencil className="mt-0.5 size-3 shrink-0 opacity-50 group-hover:opacity-100" />
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <textarea
        ref={textareaRef}
        value={editValue}
        onChange={(e) => {
          console.log('[DEBUG] EditableNote onChange:', e.target.value);
          setEditValue(e.target.value);
        }}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled || isSaving}
        className="w-full resize-none overflow-hidden rounded border border-gray-600 bg-gray-800 px-2 py-1.5 text-sm text-gray-100 placeholder-gray-500 focus:border-gray-500 focus:ring-1 focus:ring-gray-500 focus:outline-none"
        rows={1}
        autoFocus
        maxLength={1000}
      />
      {isSaving && (
        <div className="absolute top-2 right-2">
          <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
        </div>
      )}
    </div>
  );
}
