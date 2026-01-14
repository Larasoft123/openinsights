'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { X, Plus } from 'lucide-react';
import type { MetadataFieldType, TenantMetadataField } from '@/lib/db/tenant-queries/types';

interface FieldEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: FieldFormData) => Promise<void>;
  field?: TenantMetadataField | null;
  isLoading?: boolean;
}

export interface FieldFormData {
  name: string;
  label: string;
  fieldType: MetadataFieldType;
  options: string[];
  required: boolean;
  placeholder: string;
}

const FIELD_TYPES: { value: MetadataFieldType; label: string }[] = [
  { value: 'TEXT', label: 'Text' },
  { value: 'SELECT', label: 'Dropdown' },
  { value: 'BOOLEAN', label: 'Checkbox' },
  { value: 'NUMBER', label: 'Number' },
  { value: 'DATE', label: 'Date' },
];

export function FieldEditorDialog({
  open,
  onOpenChange,
  onSave,
  field,
  isLoading,
}: FieldEditorDialogProps) {
  const isEditMode = Boolean(field);

  const [name, setName] = useState('');
  const [label, setLabel] = useState('');
  const [fieldType, setFieldType] = useState<MetadataFieldType>('TEXT');
  const [options, setOptions] = useState<string[]>([]);
  const [newOption, setNewOption] = useState('');
  const [required, setRequired] = useState(false);
  const [placeholder, setPlaceholder] = useState('');
  const [error, setError] = useState('');

  // Reset form when dialog opens or field changes
  // This is a valid pattern for controlled dialogs - we populate form fields
  // when the dialog opens. The setState calls happen together in one render cycle.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (open) {
      if (field) {
        setName(field.name);
        setLabel(field.label);
        setFieldType(field.fieldType);
        setOptions(field.options || []);
        setRequired(field.required);
        setPlaceholder(field.placeholder || '');
      } else {
        setName('');
        setLabel('');
        setFieldType('TEXT');
        setOptions([]);
        setRequired(false);
        setPlaceholder('');
      }
      setNewOption('');
      setError('');
    }
  }, [open, field]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Generate name from label
  const handleLabelChange = (value: string) => {
    setLabel(value);
    if (!isEditMode) {
      // Auto-generate name slug from label
      const slug = value
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '_')
        .replace(/^[0-9]/, 'f$&'); // Prefix with 'f' if starts with number
      setName(slug);
    }
  };

  const handleAddOption = () => {
    const trimmed = newOption.trim();
    if (trimmed && !options.includes(trimmed)) {
      setOptions([...options, trimmed]);
      setNewOption('');
    }
  };

  const handleRemoveOption = (index: number) => {
    setOptions(options.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddOption();
    }
  };

  const handleSubmit = async () => {
    setError('');

    // Validation
    if (!label.trim()) {
      setError('Label is required');
      return;
    }
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    if (!/^[a-z][a-z0-9_]*$/.test(name)) {
      setError(
        'Name must start with a letter and contain only lowercase letters, numbers, and underscores'
      );
      return;
    }
    if (fieldType === 'SELECT' && options.length < 2) {
      setError('Dropdown fields must have at least 2 options');
      return;
    }

    try {
      await onSave({
        name,
        label,
        fieldType,
        options: fieldType === 'SELECT' ? options : [],
        required,
        placeholder,
      });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save field');
    }
  };

  const inputClass =
    'w-full rounded-lg border border-gray-800 bg-gray-950 px-4 py-2.5 text-white placeholder-gray-500 transition-colors outline-none focus:border-accent-primary';
  const labelClass = 'mb-2 block text-sm font-medium text-white';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit Field' : 'Add Field'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Label */}
          <div>
            <label className={labelClass}>Label *</label>
            <Input
              value={label}
              onChange={(e) => handleLabelChange(e.target.value)}
              placeholder="e.g., Participant Segment"
              className={inputClass}
            />
          </div>

          {/* Name (slug) */}
          <div>
            <label className={labelClass}>Name (ID) *</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., participant_segment"
              className={inputClass}
              disabled={isEditMode}
            />
            <p className="mt-1 text-xs text-gray-500">
              Used as identifier. Lowercase letters, numbers, and underscores only.
            </p>
          </div>

          {/* Field Type */}
          <div>
            <label className={labelClass}>Type *</label>
            <Select value={fieldType} onValueChange={(v) => setFieldType(v as MetadataFieldType)}>
              <SelectTrigger className={inputClass}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FIELD_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Options (for SELECT type) */}
          {fieldType === 'SELECT' && (
            <div>
              <label className={labelClass}>Options *</label>
              <div className="space-y-2">
                {options.map((option, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className="flex-1 rounded-lg border border-gray-800 bg-gray-950 px-4 py-2 text-sm text-white">
                      {option}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveOption(index)}
                      className="rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-white"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
                <div className="flex items-center gap-2">
                  <Input
                    value={newOption}
                    onChange={(e) => setNewOption(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Add option..."
                    className={inputClass}
                  />
                  <button
                    type="button"
                    onClick={handleAddOption}
                    className="rounded-lg bg-gray-800 p-2.5 text-white hover:bg-gray-700"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Placeholder */}
          {(fieldType === 'TEXT' || fieldType === 'NUMBER') && (
            <div>
              <label className={labelClass}>Placeholder</label>
              <Input
                value={placeholder}
                onChange={(e) => setPlaceholder(e.target.value)}
                placeholder="e.g., Enter value..."
                className={inputClass}
              />
            </div>
          )}

          {/* Required */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="required"
              checked={required}
              onChange={(e) => setRequired(e.target.checked)}
              className="text-accent-primary focus:ring-accent-primary h-4 w-4 rounded border-gray-800 bg-gray-950"
            />
            <label htmlFor="required" className="text-sm text-white">
              Required field
            </label>
          </div>

          {/* Error message */}
          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? 'Saving...' : isEditMode ? 'Save Changes' : 'Add Field'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
