import Link from 'next/link';
import { Github } from 'lucide-react';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-card border-t">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <p className="text-muted-foreground text-sm">
          {currentYear} OpenInsights. Open source research intelligence.
        </p>
        <Link
          href="https://github.com/ertad-family/openinsights"
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <Github className="size-5" />
          <span className="sr-only">GitHub</span>
        </Link>
      </div>
    </footer>
  );
}
