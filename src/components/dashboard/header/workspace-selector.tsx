/**
 * Workspace Selector Component
 *
 * Displays current workspace name with greeting.
 * Future: Will support switching between multiple workspaces.
 */

'use client';

import { useSession } from 'next-auth/react';
import { Sparkles } from 'lucide-react';

export function WorkspaceSelector() {
  const { data: session } = useSession();

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  // Extract workspace name from user session
  const workspaceName = session?.user?.name || 'Workspace';

  return (
    <div className="flex items-center gap-3">
      {/* Icon */}
      <div className="bg-accent-primary/10 hidden h-10 w-10 items-center justify-center rounded-xl sm:flex">
        <Sparkles size={20} className="text-accent-primary" />
      </div>

      {/* Greeting + Workspace */}
      <div className="flex flex-col">
        <p className="text-text-tertiary hidden text-xs sm:block">{getGreeting()}</p>
        <h1 className="text-text-primary text-sm font-semibold sm:text-base">{workspaceName}</h1>
      </div>
    </div>
  );
}
