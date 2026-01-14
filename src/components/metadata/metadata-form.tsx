'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { useDebouncedSave } from '@/lib/hooks';
import { Settings2 } from 'lucide-react';
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
import { FORM_INPUT_CLASS, FORM_LABEL_CLASS } from '@/lib/constants/form-styles';

interface MetadataFormProps {
  entityType: MetadataEntityType;
  entityId: string; // sourceId or projectId
  parentId: string; // projectId for SOURCE, workspaceId for PROJECT
  title?: string;
  description?: string;
  autoSave?: boolean;
  showCard?: boolean;
  configureUrl?: string; // URL to configure fields when none exist
}

export function MetadataForm({
  entityType,
  entityId,
  parentId,
  title = 'Custom Fields',
  description,
  autoSave = true,
  showCard = true,
  configureUrl,
}: MetadataFormProps) {
  const [fields, setFields] = useState<MetadataFieldWithValue[]>([]);
  const [values, setValues] = useState<Record<string, string | null>>({});
  const [isLoading, setIsLoading] = useState(true);

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

  // Save values (called by useDebouncedSave hook)
  const saveValues = useCallback(async () => {
    const changedValues = fields
      .filter((field) => values[field.id] !== field.value)
      .map((field) => ({
        fieldId: field.id,
        value: values[field.id],
      }));

    // Skip if nothing changed
    if (changedValues.length === 0) return;

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
  }, [apiUrl, fields, values]);

  // Auto-save with debounce - hook handles toast notifications
  useDebouncedSave(saveValues, [values], { enabled: autoSave });

  // Handle value change
  const handleValueChange = (fieldId: string, value: string | null) => {
    setValues((prev) => ({ ...prev, [fieldId]: value }));
  };

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
            className={FORM_INPUT_CLASS}
          />
        );

      case 'NUMBER':
        return (
          <Input
            type="number"
            value={value}
            onChange={(e) => handleValueChange(field.id, e.target.value || null)}
            placeholder={field.placeholder || undefined}
            className={FORM_INPUT_CLASS}
          />
        );

      case 'DATE':
        return (
          <Input
            type="date"
            value={value}
            onChange={(e) => handleValueChange(field.id, e.target.value || null)}
            className={FORM_INPUT_CLASS}
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
            <SelectTrigger className={FORM_INPUT_CLASS}>
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

  // If no fields defined, show nothing or minimal UI with optional configure link
  if (!isLoading && fields.length === 0) {
    if (!showCard) {
      // In dialog mode, show a helpful message with link
      if (configureUrl) {
        return (
          <div className="py-4 text-center">
            <p className="text-sm text-gray-400">No custom fields configured for this source.</p>
            <Link
              href={configureUrl}
              className="text-accent-primary mt-2 inline-flex items-center gap-1.5 text-sm hover:underline"
            >
              <Settings2 size={14} />
              Configure in Project Settings
            </Link>
          </div>
        );
      }
      return null;
    }
    return (
      <Card className="border-gray-800 bg-gray-900">
        <CardHeader>
          <CardTitle className="text-white">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-400">
            No custom fields configured.
            {configureUrl && (
              <>
                {' '}
                <Link href={configureUrl} className="text-accent-primary hover:underline">
                  Configure fields
                </Link>
              </>
            )}
          </p>
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
              <label className={FORM_LABEL_CLASS}>
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
