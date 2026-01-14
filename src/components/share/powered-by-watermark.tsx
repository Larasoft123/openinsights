import Link from 'next/link';
import { ExternalLink } from 'lucide-react';

export function PoweredByWatermark() {
  return (
    <div className="fixed right-4 bottom-4 z-50">
      <Link
        href="/"
        target="_blank"
        rel="noopener noreferrer"
        className="text-muted-foreground flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-900/90 px-4 py-2 text-sm shadow-lg backdrop-blur-sm transition-colors hover:bg-gray-800 hover:text-white"
      >
        <span className="font-medium">Powered by OpenInsights</span>
        <ExternalLink size={14} />
      </Link>
    </div>
  );
}
