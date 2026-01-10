/**
 * Workspace Selector Component
 *
 * Displays greeting with user name.
 */

'use client';

import { useSession } from 'next-auth/react';

export function WorkspaceSelector() {
  const { data: session } = useSession();

  // Extract first name from user session
  const firstName = session?.user?.name?.split(' ')[0] || '';

  return <h1 className="text-3xl font-bold text-white">Hi{firstName ? `, ${firstName}` : ''}!</h1>;
}
