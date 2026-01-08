import Link from 'next/link';
import { Button } from '@/components/ui/button';

/**
 * Not Found Page for Sources
 *
 * Shown when a source with the given ID doesn't exist.
 */
export default function SourceNotFound() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold">404</h1>
        <h2 className="mt-2 text-xl font-semibold">Source Not Found</h2>
        <p className="text-muted-foreground mt-2">
          The source you&apos;re looking for doesn&apos;t exist or has been deleted.
        </p>
        <Button asChild className="mt-6">
          <Link href="/projects">Back to Projects</Link>
        </Button>
      </div>
    </div>
  );
}
