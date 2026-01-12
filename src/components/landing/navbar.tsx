'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { ThemeToggle } from '../theme-toggle';
import { siteConfig } from '@/lib/config/site';

export function LandingNavbar() {
  const { data: session } = useSession();

  return (
    <nav className="border-border-subtle bg-base/80 fixed top-0 right-0 left-0 z-50 border-b backdrop-blur-md">
      <div className="flex w-full justify-center px-6 py-4">
        <div className="flex w-full max-w-4xl items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            {siteConfig.logoUrl ? (
              <Image
                src={siteConfig.logoUrl}
                alt={siteConfig.name}
                width={140}
                height={20}
                className="dark:invert"
                priority
              />
            ) : (
              <span className="text-text-primary text-lg font-semibold">{siteConfig.name}</span>
            )}
          </Link>
          <div className="hidden items-center gap-8 md:flex">
            <a
              href="https://github.com/ertad-family/openinsights"
              target="_blank"
              rel="noopener noreferrer"
              className="text-text-secondary hover:text-text-primary text-sm transition-colors"
            >
              GitHub
            </a>
            <a
              href="#features"
              className="text-text-secondary hover:text-text-primary text-sm transition-colors"
            >
              Features
            </a>
            <a
              href="#templates"
              className="text-text-secondary hover:text-text-primary text-sm transition-colors"
            >
              Templates
            </a>
            <a
              href="https://github.com/ertad-family/openinsights#readme"
              target="_blank"
              rel="noopener noreferrer"
              className="text-text-secondary hover:text-text-primary text-sm transition-colors"
            >
              Docs
            </a>
          </div>
          <div className="flex items-center gap-4">
            {session ? (
              <Link
                href="/dashboard"
                className="bg-surface-2 hover:bg-surface-3 border-border-default text-foreground rounded-md border px-3.5 py-1.5 text-sm transition-colors"
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-text-secondary hover:text-text-primary text-sm transition-colors"
                >
                  Sign in
                </Link>
                <Link
                  href="/register"
                  className="bg-surface-2 hover:bg-surface-3 border-border-default text-foreground rounded-md border px-3.5 py-1.5 text-sm transition-colors"
                >
                  Get started
                </Link>
              </>
            )}
            <ThemeToggle />
          </div>
        </div>
      </div>
    </nav>
  );
}
