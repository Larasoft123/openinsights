import type { Session } from 'next-auth';
import type { OrgRole } from '@prisma/client';
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
 * Authenticated user with workspace information (legacy)
 */
export interface AuthenticatedUser {
  id: string;
  workspaceId: string;
}

/**
 * Auth result including session and user data (legacy)
 */
export interface AuthResult {
  session: Session;
  user: AuthenticatedUser;
  workspaceId: string;
}

/**
 * Tenant auth result for multi-tenant API routes
 */
export interface TenantAuthResult {
  session: Session;
  userId: string;
  organizationId: string;
  schemaName: string;
  role: OrgRole;
  // Legacy: still available during transition
  workspaceId: string | null;
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

/**
 * Require tenant authentication middleware
 * Validates session and ensures user has an organization context
 *
 * Use this for all multi-tenant API routes. During the transition period,
 * this will also return workspaceId for legacy compatibility.
 *
 * @throws {APIError} 401 if not authenticated
 * @throws {APIError} 403 if no organization context
 * @returns Tenant auth information including schema name
 *
 * @example
 * ```ts
 * export async function GET() {
 *   const { schemaName, userId, organizationId } = await requireTenantAuth();
 *   // Use withTenantSchema(schemaName, ...) for database queries
 * }
 * ```
 */
export async function requireTenantAuth(): Promise<TenantAuthResult> {
  const sessionResult = await auth();

  if (!sessionResult?.user?.id) {
    throw new APIError('Unauthorized', 401);
  }

  const { currentOrgId, currentSchemaName, currentRole, workspaceId } = sessionResult.user;

  // If no org context, user may be in pre-migration state
  // Allow legacy workspaceId-only access for backwards compatibility
  if (!currentOrgId || !currentSchemaName) {
    // Check if any organizations exist (migration has run)
    const orgCount = await prisma.organization.count();

    if (orgCount === 0) {
      // Pre-migration: allow access via legacy workspace
      if (!workspaceId) {
        throw new APIError('No workspace assigned', 403);
      }

      // Return a mock tenant result for backwards compatibility
      return {
        session: sessionResult,
        userId: sessionResult.user.id,
        organizationId: '', // Empty during pre-migration
        schemaName: 'public', // Use public schema during pre-migration
        role: 'OWNER' as OrgRole, // Assume owner during pre-migration
        workspaceId,
      };
    }

    throw new APIError('No organization selected', 403);
  }

  // Verify membership is still valid (prevents stale JWT access)
  const membership = await prisma.organizationMember.findFirst({
    where: {
      userId: sessionResult.user.id,
      organizationId: currentOrgId,
      joinedAt: { not: null },
    },
  });

  if (!membership) {
    throw new APIError('Organization access revoked', 403);
  }

  return {
    session: sessionResult,
    userId: sessionResult.user.id,
    organizationId: currentOrgId,
    schemaName: currentSchemaName,
    role: currentRole as OrgRole,
    workspaceId,
  };
}

/**
 * Require specific organization role or higher
 *
 * @param minRole - Minimum required role (MEMBER < ADMIN < OWNER)
 * @throws {APIError} 403 if user doesn't have sufficient role
 *
 * @example
 * ```ts
 * export async function DELETE() {
 *   // Only admins and owners can delete
 *   const { organizationId } = await requireRole('ADMIN');
 *   // ...
 * }
 * ```
 */
export async function requireRole(
  minRole: 'MEMBER' | 'ADMIN' | 'OWNER'
): Promise<TenantAuthResult> {
  const authResult = await requireTenantAuth();

  const roleHierarchy: Record<OrgRole, number> = {
    MEMBER: 0,
    ADMIN: 1,
    OWNER: 2,
  };

  if (roleHierarchy[authResult.role] < roleHierarchy[minRole]) {
    throw new APIError(`Requires ${minRole} role or higher`, 403);
  }

  return authResult;
}
