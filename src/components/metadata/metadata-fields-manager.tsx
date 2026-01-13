'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { Plus, Pencil, Trash2, GripVertical, ChevronUp, ChevronDown } from 'lucide-react';
import { FieldEditorDialog, type FieldFormData } from './field-editor-dialog';
import type { TenantMetadataField, MetadataEntityType } from '@/lib/db/tenant-queries/types';

interface MetadataFieldsManagerProps {
  entityType: MetadataEntityType;
  parentId: string; // projectId for SOURCE, workspaceId for PROJECT
  title?: string;
  description?: string;
}

const FIELD_TYPE_LABELS: Record<string, string> = {
  TEXT: 'Text',
  SELECT: 'Dropdown',
  BOOLEAN: 'Checkbox',
  NUMBER: 'Number',
  DATE: 'Date',
};

export function MetadataFieldsManager({
  entityType,
  parentId,
  title = 'Custom Metadata Fields',
  description,
}: MetadataFieldsManagerProps) {
  const [fields, setFields] = useState<TenantMetadataField[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Dialog state
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingField, setEditingField] = useState<TenantMetadataField | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingField, setDeletingField] = useState<TenantMetadataField | null>(null);

  // Determine API base URL based on entity type
  const apiBaseUrl =
    entityType === 'SOURCE'
      ? `/api/projects/${parentId}/metadata-fields`
      : `/api/workspaces/${parentId}/metadata-fields`;

  // Fetch fields
  const fetchFields = useCallback(async () => {
    try {
      const response = await fetch(apiBaseUrl);
      if (!response.ok) throw new Error('Failed to fetch fields');
      const data = await response.json();
      setFields(data.fields);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load fields');
    } finally {
      setIsLoading(false);
    }
  }, [apiBaseUrl]);

  useEffect(() => {
    fetchFields();
  }, [fetchFields]);

  // Create field
  const handleCreate = async (data: FieldFormData) => {
    setIsSaving(true);
    try {
      const response = await fetch(apiBaseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create field');
      }
      const result = await response.json();
      setFields([...fields, result.field]);
      toast.success('Field created');
    } finally {
      setIsSaving(false);
    }
  };

  // Update field
  const handleUpdate = async (data: FieldFormData) => {
    if (!editingField) return;
    setIsSaving(true);
    try {
      const response = await fetch(`${apiBaseUrl}/${editingField.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update field');
      }
      const result = await response.json();
      setFields(fields.map((f) => (f.id === editingField.id ? result.field : f)));
      toast.success('Field updated');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete field
  const handleDelete = async () => {
    if (!deletingField) return;
    setIsSaving(true);
    try {
      const response = await fetch(`${apiBaseUrl}/${deletingField.id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete field');
      }
      setFields(fields.filter((f) => f.id !== deletingField.id));
      toast.success('Field deleted');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete field');
    } finally {
      setIsSaving(false);
      setDeleteDialogOpen(false);
      setDeletingField(null);
    }
  };

  // Reorder fields
  const handleReorder = async (fieldId: string, direction: 'up' | 'down') => {
    const currentIndex = fields.findIndex((f) => f.id === fieldId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= fields.length) return;

    // Optimistic update
    const newFields = [...fields];
    [newFields[currentIndex], newFields[newIndex]] = [newFields[newIndex], newFields[currentIndex]];
    setFields(newFields);

    // Send reorder request
    try {
      const response = await fetch(`${apiBaseUrl}/reorder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fieldIds: newFields.map((f) => f.id) }),
      });
      if (!response.ok) {
        throw new Error('Failed to reorder fields');
      }
    } catch {
      // Revert on error
      setFields(fields);
      toast.error('Failed to reorder fields');
    }
  };

  // Open editor for new field
  const openCreateDialog = () => {
    setEditingField(null);
    setEditorOpen(true);
  };

  // Open editor for existing field
  const openEditDialog = (field: TenantMetadataField) => {
    setEditingField(field);
    setEditorOpen(true);
  };

  // Open delete confirmation
  const openDeleteDialog = (field: TenantMetadataField) => {
    setDeletingField(field);
    setDeleteDialogOpen(true);
  };

  const defaultDescription =
    entityType === 'SOURCE'
      ? 'Define custom fields that can be filled for each source in this project'
      : 'Define custom fields that can be filled for each project in this workspace';

  if (isLoading) {
    return (
      <Card className="border-gray-800 bg-gray-900">
        <CardHeader>
          <CardTitle className="text-white">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8 text-gray-400">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-gray-800 bg-gray-900">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white">{title}</CardTitle>
              <CardDescription>{description || defaultDescription}</CardDescription>
            </div>
            <Button onClick={openCreateDialog} size="sm" className="gap-2">
              <Plus size={16} />
              Add Field
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {fields.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-800 py-8 text-center">
              <p className="text-gray-400">No custom fields defined yet</p>
              <p className="mt-1 text-sm text-gray-500">
                Add fields to track additional information
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="flex items-center gap-3 rounded-lg border border-gray-800 bg-gray-950 p-3"
                >
                  {/* Reorder buttons */}
                  <div className="flex flex-col gap-0.5">
                    <button
                      type="button"
                      onClick={() => handleReorder(field.id, 'up')}
                      disabled={index === 0}
                      className="rounded p-0.5 text-gray-500 hover:bg-gray-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      <ChevronUp size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReorder(field.id, 'down')}
                      disabled={index === fields.length - 1}
                      className="rounded p-0.5 text-gray-500 hover:bg-gray-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      <ChevronDown size={14} />
                    </button>
                  </div>

                  {/* Drag handle (visual only) */}
                  <GripVertical size={16} className="text-gray-600" />

                  {/* Field info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white">{field.label}</span>
                      {field.required && (
                        <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-xs text-amber-400">
                          Required
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>{FIELD_TYPE_LABELS[field.fieldType] || field.fieldType}</span>
                      <span>|</span>
                      <code className="rounded bg-gray-800 px-1">{field.name}</code>
                      {field.fieldType === 'SELECT' && field.options.length > 0 && (
                        <>
                          <span>|</span>
                          <span>{field.options.length} options</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEditDialog(field)}
                      className="rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-white"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => openDeleteDialog(field)}
                      className="rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-red-400"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Field Editor Dialog */}
      <FieldEditorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        onSave={editingField ? handleUpdate : handleCreate}
        field={editingField}
        isLoading={isSaving}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Field</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the field &quot;{deletingField?.label}&quot;? This
              will also delete all values stored for this field. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isSaving}
              className="bg-red-600 hover:bg-red-700"
            >
              {isSaving ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
