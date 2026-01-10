'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Github } from 'lucide-react';

export function LandingFooter() {
  return (
    <footer className="border-border-subtle bg-base border-t">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="mb-8 grid grid-cols-1 gap-8 md:grid-cols-4">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link href="/" className="mb-4 inline-block">
              <Image
                src="/nin-logo.png"
                alt="OpenInsights"
                width={140}
                height={20}
                className="dark:invert"
              />
            </Link>
            <p className="text-text-tertiary text-sm">
              Privacy-first research intelligence platform for qualitative researchers.
            </p>
            <div className="mt-4">
              <a
                href="https://github.com/ertad-family/openinsights"
                target="_blank"
                rel="noopener noreferrer"
                className="text-text-secondary hover:text-text-primary inline-flex items-center gap-2 transition-colors"
              >
                <Github className="h-5 w-5" />
                <span className="text-sm">Star on GitHub</span>
              </a>
            </div>
          </div>

          {/* Product */}
          <div>
            <h3 className="text-text-primary mb-4 text-sm font-semibold">Product</h3>
            <ul className="space-y-3">
              <li>
                <a
                  href="#features"
                  className="text-text-tertiary hover:text-text-primary text-sm transition-colors"
                >
                  Features
                </a>
              </li>
              <li>
                <a
                  href="#templates"
                  className="text-text-tertiary hover:text-text-primary text-sm transition-colors"
                >
                  Templates
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/ertad-family/openinsights#roadmap"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-text-tertiary hover:text-text-primary text-sm transition-colors"
                >
                  Roadmap
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/ertad-family/openinsights/releases"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-text-tertiary hover:text-text-primary text-sm transition-colors"
                >
                  Changelog
                </a>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="text-text-primary mb-4 text-sm font-semibold">Resources</h3>
            <ul className="space-y-3">
              <li>
                <a
                  href="https://github.com/ertad-family/openinsights#readme"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-text-tertiary hover:text-text-primary text-sm transition-colors"
                >
                  Documentation
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/ertad-family/openinsights#deployment"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-text-tertiary hover:text-text-primary text-sm transition-colors"
                >
                  Self-hosting Guide
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/ertad-family/openinsights/issues"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-text-tertiary hover:text-text-primary text-sm transition-colors"
                >
                  GitHub Issues
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/ertad-family/openinsights/discussions"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-text-tertiary hover:text-text-primary text-sm transition-colors"
                >
                  Discussions
                </a>
              </li>
            </ul>
          </div>

          {/* Community */}
          <div>
            <h3 className="text-text-primary mb-4 text-sm font-semibold">Community</h3>
            <ul className="space-y-3">
              <li>
                <a
                  href="https://github.com/ertad-family/openinsights"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-text-tertiary hover:text-text-primary text-sm transition-colors"
                >
                  GitHub
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/ertad-family/openinsights/blob/main/CONTRIBUTING.md"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-text-tertiary hover:text-text-primary text-sm transition-colors"
                >
                  Contributing
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/ertad-family/openinsights/blob/main/LICENSE"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-text-tertiary hover:text-text-primary text-sm transition-colors"
                >
                  License (MIT)
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-border-subtle flex flex-col items-center justify-between gap-4 border-t pt-8 md:flex-row">
          <p className="text-text-tertiary text-sm">
            © {new Date().getFullYear()} OpenInsights. Open source and self-hosted.
          </p>
          <div className="flex items-center gap-6">
            <a
              href="https://github.com/ertad-family/openinsights/blob/main/CODE_OF_CONDUCT.md"
              target="_blank"
              rel="noopener noreferrer"
              className="text-text-tertiary hover:text-text-primary text-sm transition-colors"
            >
              Code of Conduct
            </a>
            <a
              href="https://github.com/ertad-family/openinsights/security"
              target="_blank"
              rel="noopener noreferrer"
              className="text-text-tertiary hover:text-text-primary text-sm transition-colors"
            >
              Security
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
