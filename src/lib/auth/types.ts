import type { DefaultSession } from 'next-auth';
import type { OrgRole } from '@prisma/client';

/**
 * Organization membership info stored in session
 */
export interface SessionOrganization {
  id: string;
  name: string;
  slug: string;
  schemaName: string;
  role: OrgRole;
}

/**
 * Extended session user with organization context
 */
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      // Multi-tenant: organization context
      organizations: SessionOrganization[];
      currentOrgId: string | null;
      currentOrgSlug: string | null;
      currentSchemaName: string | null;
      currentRole: OrgRole | null;
    } & DefaultSession['user'];
  }
}

/**
 * Extended JWT type (used locally in callbacks)
 */
export interface ExtendedJWT {
  id?: string;
  // Multi-tenant
  organizations?: SessionOrganization[];
  currentOrgId?: string | null;
  currentOrgSlug?: string | null;
  currentSchemaName?: string | null;
  currentRole?: OrgRole | null;
  // Standard JWT fields
  sub?: string;
  name?: string;
  email?: string;
  picture?: string;
  image?: string | null;
}
