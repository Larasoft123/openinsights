'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserMenu } from './user-menu';

const navigation = [
  { name: 'Dashboard', href: '/dashboard' },
  { name: 'Projects', href: '/projects' },
];

export function Header() {
  const pathname = usePathname();

  return (
    <header className="bg-card border-b">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
        {/* Logo & Nav */}
        <div className="flex items-center gap-8">
          <Link href="/dashboard" className="text-lg font-semibold">
            OpenInsights
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {navigation.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                  }`}
                >
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Menu */}
        <UserMenu />
      </div>
    </header>
  );
}
