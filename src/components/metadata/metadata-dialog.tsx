'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MetadataForm } from './metadata-form';
import type { MetadataEntityType } from '@/lib/db/tenant-queries/types';

interface MetadataDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: MetadataEntityType;
  entityId: string;
  parentId: string;
  title?: string;
}

export function MetadataDialog({
  open,
  onOpenChange,
  entityType,
  entityId,
  parentId,
  title = 'Custom Fields',
}: MetadataDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="py-2">
          <MetadataForm
            entityType={entityType}
            entityId={entityId}
            parentId={parentId}
            showCard={false}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
