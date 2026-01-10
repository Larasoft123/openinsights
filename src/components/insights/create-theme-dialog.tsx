'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ColorPicker } from '@/components/ui/color-picker';
import { AlertMessage } from '@/components/ui/alert-message';
import { THEME_COLORS } from '@/lib/constants/colors';

interface NewTheme {
  id: string;
  name: string;
  description: string | null;
  color: string;
}

interface CreateThemeDialogProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (theme: NewTheme) => void;
}

export function CreateThemeDialog({
  projectId,
  open,
  onOpenChange,
  onCreated,
}: CreateThemeDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(THEME_COLORS[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/projects/${projectId}/themes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          color,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create theme');
      }

      const data = await res.json();
      onCreated(data.theme);

      // Reset form
      setName('');
      setDescription('');
      setColor(THEME_COLORS[0]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create theme');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={() => onOpenChange(false)} />

      {/* Dialog */}
      <div className="bg-card relative z-10 w-full max-w-md rounded-lg border p-6 shadow-lg">
        <h2 className="mb-4 text-lg font-semibold">Create Theme</h2>

        <form onSubmit={handleSubmit}>
          {/* Name */}
          <div className="mb-4">
            <label htmlFor="name" className="text-sm font-medium">
              Name
            </label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., User Pain Points"
              className="mt-1"
              autoFocus
            />
          </div>

          {/* Description */}
          <div className="mb-4">
            <label htmlFor="description" className="text-sm font-medium">
              Description (optional)
            </label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this theme"
              className="mt-1"
            />
          </div>

          {/* Color */}
          <div className="mb-6">
            <label className="text-sm font-medium">Color</label>
            <div className="mt-2">
              <ColorPicker
                colors={THEME_COLORS}
                selectedColor={color}
                onColorChange={(c) => setColor(c as (typeof THEME_COLORS)[number])}
                size="md"
              />
            </div>
          </div>

          {/* Error */}
          {error && <AlertMessage variant="error" message={error} className="mb-4" />}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !name.trim()}>
              {loading ? 'Creating...' : 'Create Theme'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
