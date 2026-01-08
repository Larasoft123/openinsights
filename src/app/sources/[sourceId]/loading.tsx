import { Skeleton } from '@/components/ui/skeleton';

/**
 * Loading State for Analysis Canvas
 *
 * Shows skeleton UI while source data is being fetched.
 */
export default function SourceLoading() {
  return (
    <div className="flex h-screen flex-col">
      {/* Header skeleton */}
      <header className="bg-background shrink-0 border-b px-6 py-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-20" />
          <span className="text-muted-foreground">/</span>
          <Skeleton className="h-4 w-24" />
          <span className="text-muted-foreground">/</span>
          <Skeleton className="h-4 w-32" />
        </div>
      </header>

      {/* Main content skeleton */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left column - Video Player skeleton */}
        <div className="w-1/2 shrink-0 border-r p-4">
          <div className="flex h-full flex-col gap-4">
            {/* Video area */}
            <Skeleton className="aspect-video w-full rounded-lg" />

            {/* Controls skeleton */}
            <div className="flex items-center gap-4">
              <Skeleton className="size-10 rounded-full" />
              <Skeleton className="h-2 flex-1 rounded-full" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
        </div>

        {/* Right column - Transcript skeleton */}
        <div className="flex w-1/2 flex-col overflow-hidden">
          {/* Search skeleton */}
          <div className="shrink-0 border-b p-4">
            <Skeleton className="h-10 w-full" />
          </div>

          {/* Transcript segments skeleton */}
          <div className="flex-1 space-y-2 overflow-hidden p-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-4 w-12 shrink-0" />
                <Skeleton className="h-4 flex-1" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
