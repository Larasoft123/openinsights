'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { SourceList } from './source-list';
import { SourceUploadDialog } from './source-upload-dialog';

type ProcessingStatus = 'PENDING' | 'UPLOADING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

interface Source {
  id: string;
  title: string;
  fileName: string;
  fileType: string;
  status: ProcessingStatus;
  duration: number | null;
  createdAt: string;
  updatedAt: string;
  processingStep: string | null;
  processingProgress: number | null;
  processingStartedAt: string | null;
}

interface SourcesSectionProps {
  projectId: string;
  initialSources: Source[];
}

export function SourcesSection({ projectId, initialSources }: SourcesSectionProps) {
  const [sources, setSources] = useState<Source[]>(initialSources);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleUploaded = (newSource: {
    id: string;
    title: string;
    fileName: string;
    fileType: string;
    status: string;
    createdAt: string;
  }) => {
    // Add the new source to the beginning of the list
    const sourceWithDefaults: Source = {
      ...newSource,
      status: newSource.status as ProcessingStatus,
      duration: null,
      updatedAt: newSource.createdAt,
      processingStep: null,
      processingProgress: null,
      processingStartedAt: null,
    };
    setSources((prev) => [sourceWithDefaults, ...prev]);
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Sources</h2>
        <Button onClick={() => setDialogOpen(true)} size="sm">
          <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          Upload Source
        </Button>
      </div>

      <SourceList projectId={projectId} initialSources={sources} />

      <SourceUploadDialog
        projectId={projectId}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onUploaded={handleUploaded}
      />
    </div>
  );
}
