'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { MetadataFieldWithValue, MetadataEntityType } from '@/lib/db/tenant-queries/types';

interface MetadataFormProps {
  entityType: MetadataEntityType;
  entityId: string; // sourceId or projectId
  parentId: string; // projectId for SOURCE, workspaceId for PROJECT
  title?: string;
  description?: string;
  autoSave?: boolean;
  showCard?: boolean;
}

export function MetadataForm({
  entityType,
  entityId,
  parentId,
  title = 'Custom Fields',
  description,
  autoSave = true,
  showCard = true,
}: MetadataFormProps) {
  const [fields, setFields] = useState<MetadataFieldWithValue[]>([]);
  const [values, setValues] = useState<Record<string, string | null>>({});
  const [isLoading, setIsLoading] = useState(true);

  const isInitialMount = useRef(true);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const toastIdRef = useRef<string | number | null>(null);

  // Determine API URL based on entity type
  const apiUrl =
    entityType === 'SOURCE'
      ? `/api/projects/${parentId}/sources/${entityId}/metadata`
      : `/api/projects/${entityId}/metadata`;

  // Fetch fields with values
  const fetchMetadata = useCallback(async () => {
    try {
      const response = await fetch(apiUrl);
      if (!response.ok) throw new Error('Failed to fetch metadata');
      const data = await response.json();
      setFields(data.fields);
      // Initialize values map
      const valuesMap: Record<string, string | null> = {};
      data.fields.forEach((field: MetadataFieldWithValue) => {
        valuesMap[field.id] = field.value;
      });
      setValues(valuesMap);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load metadata');
    } finally {
      setIsLoading(false);
    }
  }, [apiUrl]);

  useEffect(() => {
    fetchMetadata();
  }, [fetchMetadata]);

  // Save values
  const saveValues = useCallback(async () => {
    const changedValues = fields
      .filter((field) => values[field.id] !== field.value)
      .map((field) => ({
        fieldId: field.id,
        value: values[field.id],
      }));

    if (changedValues.length === 0) return;

    toastIdRef.current = toast.loading('Saving...');

    try {
      const response = await fetch(apiUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ values: changedValues }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save metadata');
      }

      const data = await response.json();
      setFields(data.fields);
      toast.success('Saved', { id: toastIdRef.current });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save', {
        id: toastIdRef.current,
      });
    }
  }, [apiUrl, fields, values]);

  // Auto-save effect
  useEffect(() => {
    if (!autoSave) return;

    // Skip initial mount
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    // Clear previous timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new timeout for debounced save (800ms delay)
    saveTimeoutRef.current = setTimeout(() => {
      saveValues();
    }, 800);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [values, autoSave, saveValues]);

  // Handle value change
  const handleValueChange = (fieldId: string, value: string | null) => {
    setValues((prev) => ({ ...prev, [fieldId]: value }));
  };

  const inputClass =
    'w-full rounded-lg border border-gray-800 bg-gray-950 px-4 py-2.5 text-white placeholder-gray-500 transition-colors outline-none focus:border-accent-primary';
  const labelClass = 'mb-2 block text-sm font-medium text-white';

  // Render field input based on type
  const renderFieldInput = (field: MetadataFieldWithValue) => {
    const value = values[field.id] ?? '';

    switch (field.fieldType) {
      case 'TEXT':
        return (
          <Input
            type="text"
            value={value}
            onChange={(e) => handleValueChange(field.id, e.target.value || null)}
            placeholder={field.placeholder || undefined}
            className={inputClass}
          />
        );

      case 'NUMBER':
        return (
          <Input
            type="number"
            value={value}
            onChange={(e) => handleValueChange(field.id, e.target.value || null)}
            placeholder={field.placeholder || undefined}
            className={inputClass}
          />
        );

      case 'DATE':
        return (
          <Input
            type="date"
            value={value}
            onChange={(e) => handleValueChange(field.id, e.target.value || null)}
            className={inputClass}
          />
        );

      case 'BOOLEAN':
        return (
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id={`field-${field.id}`}
              checked={value === 'true'}
              onChange={(e) => handleValueChange(field.id, e.target.checked ? 'true' : 'false')}
              className="text-accent-primary focus:ring-accent-primary h-4 w-4 rounded border-gray-800 bg-gray-950"
            />
            <label htmlFor={`field-${field.id}`} className="text-sm text-gray-300">
              Yes
            </label>
          </div>
        );

      case 'SELECT':
        return (
          <Select value={value || undefined} onValueChange={(v) => handleValueChange(field.id, v)}>
            <SelectTrigger className={inputClass}>
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              {field.options.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      default:
        return null;
    }
  };

  // If no fields defined, show nothing or minimal UI
  if (!isLoading && fields.length === 0) {
    if (!showCard) return null;
    return (
      <Card className="border-gray-800 bg-gray-900">
        <CardHeader>
          <CardTitle className="text-white">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-400">No custom fields configured</p>
        </CardContent>
      </Card>
    );
  }

  const content = (
    <>
      {isLoading ? (
        <div className="flex items-center justify-center py-4 text-gray-400">Loading...</div>
      ) : (
        <div className="space-y-4">
          {fields.map((field) => (
            <div key={field.id}>
              <label className={labelClass}>
                {field.label}
                {field.required && <span className="ml-1 text-amber-400">*</span>}
              </label>
              {renderFieldInput(field)}
            </div>
          ))}
        </div>
      )}
    </>
  );

  if (!showCard) {
    return content;
  }

  const defaultDescription =
    entityType === 'SOURCE'
      ? 'Additional information for this source'
      : 'Additional information for this project';

  return (
    <Card className="border-gray-800 bg-gray-900">
      <CardHeader>
        <CardTitle className="text-white">{title}</CardTitle>
        <CardDescription>{description || defaultDescription}</CardDescription>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  );
}
