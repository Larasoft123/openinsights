import type { DefaultSession } from 'next-auth';

/**
 * Extended session user with workspace info
 */
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      workspaceId: string | null;
    } & DefaultSession['user'];
  }

  interface User {
    workspaceId?: string | null;
  }
}

/**
 * Extended JWT type (used locally in callbacks)
 */
export interface ExtendedJWT {
  id?: string;
  workspaceId?: string | null;
  sub?: string;
  name?: string;
  email?: string;
  picture?: string;
}
