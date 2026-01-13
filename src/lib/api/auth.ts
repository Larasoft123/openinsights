import type { Session } from 'next-auth';
import type { OrgRole } from '@prisma/client';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getUserDefaultWorkspaceId } from '@/lib/db/tenant-queries';

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
 * Tenant auth result for multi-tenant API routes
 */
export interface TenantAuthResult {
  session: Session;
  userId: string;
  organizationId: string;
  schemaName: string;
  role: OrgRole;
  /** User's default workspace ID from the tenant schema */
  workspaceId: string;
}

/**
 * Require tenant authentication middleware
 * Validates session and ensures user has an organization context
 *
 * @throws {APIError} 401 if not authenticated
 * @throws {APIError} 403 if no organization context or no workspace assigned
 * @returns Tenant auth information including schema name and workspace ID
 *
 * @example
 * ```ts
 * export async function GET() {
 *   const { schemaName, userId, workspaceId } = await requireTenantAuth();
 *   // Use schemaName for tenant-specific queries
 *   // Use workspaceId for workspace-scoped operations
 * }
 * ```
 */
export async function requireTenantAuth(): Promise<TenantAuthResult> {
  const sessionResult = await auth();

  if (!sessionResult?.user?.id) {
    throw new APIError('Unauthorized', 401);
  }

  const { currentOrgId, currentSchemaName, currentRole } = sessionResult.user;

  if (!currentOrgId || !currentSchemaName) {
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

  // Get user's default workspace from the tenant schema
  const workspaceId = await getUserDefaultWorkspaceId(currentSchemaName, sessionResult.user.id);

  if (!workspaceId) {
    throw new APIError('No workspace assigned', 403);
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

/**
 * @deprecated Use requireTenantAuth() instead
 * Legacy requireAuth that now wraps requireTenantAuth for backwards compatibility
 */
export async function requireAuth(): Promise<TenantAuthResult> {
  return requireTenantAuth();
}
