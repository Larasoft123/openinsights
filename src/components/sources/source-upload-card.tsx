/**
 * Source Upload Card Component
 *
 * Drag-and-drop card for uploading sources directly in the grid.
 * Follows Modern Smart Home Dashboard add device pattern.
 */

'use client';

import { useState, useRef } from 'react';
import { Upload } from 'lucide-react';

const ACCEPTED_FILE_TYPES = [
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'audio/mp3',
  'audio/wav',
  'audio/mpeg',
  'audio/m4a',
];

interface SourceUploadCardProps {
  onFileSelect: (file: File) => void;
}

export function SourceUploadCard({ onFileSelect }: SourceUploadCardProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      onFileSelect(droppedFile);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      onFileSelect(selectedFile);
    }
  };

  return (
    <>
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`group relative aspect-video cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed transition-all duration-300 ${
          isDragging
            ? 'border-accent-primary bg-accent-primary/10 scale-[1.02]'
            : 'hover:border-accent-primary border-border bg-background/50 hover:bg-muted/50'
        }`}
      >
        <div className="flex h-full flex-col items-center justify-center gap-3 p-6">
          <div
            className={`flex h-16 w-16 items-center justify-center rounded-full transition-colors ${
              isDragging ? 'bg-accent-primary' : 'group-hover:bg-accent-primary bg-muted'
            }`}
          >
            <Upload
              size={32}
              strokeWidth={1.5}
              className={`transition-colors ${
                isDragging ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground'
              }`}
            />
          </div>
          <div className="text-center">
            <h3 className="text-foreground text-sm font-medium">
              {isDragging ? 'Drop file here' : 'Upload Source'}
            </h3>
            <p className="text-muted-foreground mt-1 text-xs">
              {isDragging ? 'Release to upload' : 'Drag and drop or click to browse'}
            </p>
            <p className="text-muted-foreground mt-2 text-xs">
              MP4, WebM, QuickTime, MP3, WAV, M4A (max 2GB)
            </p>
          </div>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_FILE_TYPES.join(',')}
        onChange={handleInputChange}
        className="hidden"
      />
    </>
  );
}
