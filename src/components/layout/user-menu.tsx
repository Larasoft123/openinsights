'use client';

import { useState } from 'react';
import { signOut, useSession } from 'next-auth/react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function UserMenu() {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);

  if (!session?.user) {
    return null;
  }

  const initials = session.user.name
    ? session.user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : session.user.email?.slice(0, 2).toUpperCase() || 'U';

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-primary text-primary-foreground flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium"
      >
        {session.user.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={session.user.image}
            alt={session.user.name || 'User'}
            className="h-8 w-8 rounded-full"
          />
        ) : (
          initials
        )}
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

          {/* Dropdown */}
          <div className="bg-card absolute right-0 z-50 mt-2 w-56 rounded-md border py-1 shadow-lg">
            <div className="border-b px-4 py-2">
              <p className="text-sm font-medium">{session.user.name || 'User'}</p>
              <p className="text-muted-foreground truncate text-xs">{session.user.email}</p>
            </div>
            <div className="p-1">
              <Link href="/settings" onClick={() => setIsOpen(false)}>
                <Button variant="ghost" className="w-full justify-start">
                  Settings
                </Button>
              </Link>
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={() => {
                  setIsOpen(false);
                  signOut({ callbackUrl: '/' });
                }}
              >
                Sign out
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
