'use client';

import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

const ACCEPTED_FILE_TYPES = [
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'audio/mp3',
  'audio/wav',
  'audio/mpeg',
  'audio/m4a',
];

const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024; // 2GB

interface Source {
  id: string;
  title: string;
  fileName: string;
  fileType: string;
  status: string;
  createdAt: string;
}

interface SourceUploadDialogProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploaded: (source: Source) => void;
}

type UploadStep = 'select' | 'uploading' | 'processing';

export function SourceUploadDialog({
  projectId,
  open,
  onOpenChange,
  onUploaded,
}: SourceUploadDialogProps) {
  const [step, setStep] = useState<UploadStep>('select');
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);

  const resetForm = useCallback(() => {
    setStep('select');
    setFile(null);
    setTitle('');
    setUploadProgress(0);
    setError(null);
    setIsDragging(false);
    if (xhrRef.current) {
      xhrRef.current.abort();
      xhrRef.current = null;
    }
  }, []);

  const handleClose = useCallback(() => {
    if (step === 'uploading') {
      // Warn user before closing during upload
      if (!confirm('Upload in progress. Are you sure you want to cancel?')) {
        return;
      }
    }
    resetForm();
    onOpenChange(false);
  }, [step, resetForm, onOpenChange]);

  const validateFile = (f: File): string | null => {
    if (!ACCEPTED_FILE_TYPES.includes(f.type)) {
      return `Invalid file type. Accepted: MP4, WebM, QuickTime, MP3, WAV, M4A`;
    }
    if (f.size > MAX_FILE_SIZE) {
      return `File too large. Maximum size is 2GB.`;
    }
    return null;
  };

  const handleFileSelect = (f: File) => {
    const validationError = validateFile(f);
    if (validationError) {
      setError(validationError);
      return;
    }
    setFile(f);
    setTitle(f.name.replace(/\.[^/.]+$/, '')); // Remove extension
    setError(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setStep('uploading');
    setError(null);
    setUploadProgress(0);

    try {
      // Step 1: Create source and get presigned URL
      const createRes = await fetch(`/api/projects/${projectId}/sources`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim() || file.name,
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
        }),
      });

      if (!createRes.ok) {
        const data = await createRes.json();
        throw new Error(data.error || 'Failed to create source');
      }

      const { source, uploadUrl } = await createRes.json();

      // Step 2: Upload directly to S3 with progress tracking
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhrRef.current = xhr;

        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            setUploadProgress(Math.round((e.loaded / e.total) * 100));
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        });

        xhr.addEventListener('error', () => reject(new Error('Network error during upload')));
        xhr.addEventListener('abort', () => reject(new Error('Upload cancelled')));

        xhr.open('PUT', uploadUrl);
        xhr.setRequestHeader('Content-Type', file.type);
        xhr.send(file);
      });

      // Step 3: Confirm upload and start processing
      setStep('processing');

      const completeRes = await fetch(`/api/projects/${projectId}/sources/${source.id}/complete`, {
        method: 'POST',
      });

      if (!completeRes.ok) {
        const data = await completeRes.json();
        throw new Error(data.error || 'Failed to start processing');
      }

      // Success - notify parent and close
      onUploaded({ ...source, status: 'PROCESSING' });
      resetForm();
      onOpenChange(false);
    } catch (err) {
      if (err instanceof Error && err.message === 'Upload cancelled') {
        resetForm();
        return;
      }
      setError(err instanceof Error ? err.message : 'Upload failed');
      setStep('select');
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      {/* Dialog */}
      <div className="bg-card relative z-10 w-full max-w-lg rounded-lg border p-6 shadow-lg">
        <h2 className="mb-4 text-lg font-semibold">Upload Source</h2>

        {step === 'select' && (
          <>
            {/* Drag and Drop Zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`mb-4 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors ${
                isDragging
                  ? 'border-primary bg-primary/5'
                  : file
                    ? 'border-green-500 bg-green-50 dark:bg-green-950/20'
                    : 'border-muted-foreground/25 hover:border-primary/50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_FILE_TYPES.join(',')}
                onChange={handleInputChange}
                className="hidden"
              />

              {file ? (
                <>
                  <svg
                    className="mb-2 h-10 w-10 text-green-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <p className="text-sm font-medium">{file.name}</p>
                  <p className="text-muted-foreground text-xs">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                      setTitle('');
                    }}
                    className="text-muted-foreground hover:text-foreground mt-2 text-xs underline"
                  >
                    Choose different file
                  </button>
                </>
              ) : (
                <>
                  <svg
                    className="text-muted-foreground mb-2 h-10 w-10"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                  <p className="text-sm font-medium">
                    Drag and drop your file here, or click to browse
                  </p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    MP4, WebM, QuickTime, MP3, WAV, M4A (max 2GB)
                  </p>
                </>
              )}
            </div>

            {/* Title Input */}
            {file && (
              <div className="mb-4">
                <label htmlFor="title" className="text-sm font-medium">
                  Title
                </label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter a title for this source"
                  className="mt-1"
                />
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="bg-destructive/10 text-destructive mb-4 rounded px-3 py-2 text-sm">
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleUpload} disabled={!file}>
                Upload
              </Button>
            </div>
          </>
        )}

        {step === 'uploading' && (
          <div className="py-8">
            <div className="mb-4 text-center">
              <p className="text-sm font-medium">Uploading {file?.name}</p>
              <p className="text-muted-foreground text-xs">{uploadProgress}% complete</p>
            </div>

            {/* Progress Bar */}
            <div className="bg-secondary mb-6 h-2 overflow-hidden rounded-full">
              <div
                className="bg-primary h-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>

            <div className="flex justify-center">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {step === 'processing' && (
          <div className="py-8 text-center">
            <LoadingSpinner size="lg" className="text-primary mx-auto mb-4" />
            <p className="text-sm font-medium">Starting processing...</p>
            <p className="text-muted-foreground text-xs">This will only take a moment</p>
          </div>
        )}
      </div>
    </div>
  );
}
