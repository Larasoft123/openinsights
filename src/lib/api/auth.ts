import type { Session } from 'next-auth';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

/**
 * Custom API Error class for consistent error handling
 */
export class APIError extends Error {
  constructor(
    public message: string,
    public status: number = 500
  ) {
    super(message);
    this.name = 'APIError';
  }
}

/**
 * Authenticated user with workspace information
 */
export interface AuthenticatedUser {
  id: string;
  workspaceId: string;
}

/**
 * Auth result including session and user data
 */
export interface AuthResult {
  session: Session;
  user: AuthenticatedUser;
  workspaceId: string;
}

/**
 * Require authentication middleware
 * Validates session and ensures user has an assigned workspace
 *
 * @throws {APIError} 401 if not authenticated
 * @throws {APIError} 403 if no workspace assigned
 * @returns Authenticated user information
 *
 * @example
 * ```ts
 * export async function GET() {
 *   const { session, user, workspaceId } = await requireAuth();
 *   // ... use authenticated data
 * }
 * ```
 */
export async function requireAuth(): Promise<AuthResult> {
  const sessionResult = await auth();

  if (!sessionResult?.user) {
    throw new APIError('Unauthorized', 401);
  }

  const user = await prisma.user.findUnique({
    where: { id: sessionResult.user.id },
    select: { id: true, workspaceId: true },
  });

  if (!user?.workspaceId) {
    throw new APIError('No workspace assigned', 403);
  }

  return {
    session: sessionResult as Session,
    user: { id: user.id, workspaceId: user.workspaceId },
    workspaceId: user.workspaceId,
  };
}
