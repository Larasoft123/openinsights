import NextAuth from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { tenantSchemaExists, createTenantSchema, withTenantSchema } from '@/lib/db/tenant';
import type { Adapter } from 'next-auth/adapters';
import { authConfig } from './auth.config';
import './types';

/**
 * Full NextAuth configuration for Node.js runtime (API routes)
 *
 * This extends the edge-safe config with:
 * - PrismaAdapter for database sessions
 * - Credentials provider with bcrypt
 * - JWT callback with database calls
 * - Events with database calls
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma) as Adapter,
  providers: [
    // Include OAuth providers from base config
    ...authConfig.providers,
    // Add Credentials provider (requires bcrypt - Node.js only)
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email as string;
        const password = credentials.password as string;

        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user || !user.password) {
          return null;
        }

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          workspaceId: user.workspaceId,
        };
      },
    }),
  ],
  callbacks: {
    // Keep session callback from base config
    ...authConfig.callbacks,
    /**
     * JWT callback with database calls (Node.js only)
     * Fetches organization memberships on sign-in
     */
    async jwt({ token, user, trigger, session }) {
      // Initial sign-in: add user data and fetch org memberships
      if (user) {
        token.id = user.id;
        token.workspaceId = user.workspaceId;

        // Fetch organization memberships
        const memberships = await prisma.organizationMember.findMany({
          where: {
            userId: user.id,
            joinedAt: { not: null }, // Only active memberships
          },
          include: { organization: true },
          orderBy: { joinedAt: 'asc' },
        });

        token.organizations = memberships.map((m) => ({
          id: m.organization.id,
          name: m.organization.name,
          slug: m.organization.slug,
          schemaName: m.organization.schemaName,
          role: m.role,
        }));

        // Default to first org (or null if no orgs yet - pre-migration state)
        if (memberships.length > 0) {
          const firstOrg = memberships[0].organization;
          token.currentOrgId = firstOrg.id;
          token.currentOrgSlug = firstOrg.slug;
          token.currentSchemaName = firstOrg.schemaName;
          token.currentRole = memberships[0].role;
        }
      }

      // Handle organization switching (cloud only)
      const tokenId = token.id as string | undefined;
      if (trigger === 'update' && tokenId) {
        // Switch to different organization if requested
        const switchToOrgId = (session as { switchToOrgId?: string } | undefined)?.switchToOrgId;
        if (switchToOrgId) {
          const membership = await prisma.organizationMember.findFirst({
            where: {
              userId: tokenId,
              organizationId: switchToOrgId,
              joinedAt: { not: null },
            },
            include: { organization: true },
          });

          if (membership) {
            token.currentOrgId = membership.organization.id;
            token.currentOrgSlug = membership.organization.slug;
            token.currentSchemaName = membership.organization.schemaName;
            token.currentRole = membership.role;
          }
        }

        // Refresh workspace ID (legacy)
        const dbUser = await prisma.user.findUnique({
          where: { id: tokenId },
          select: { workspaceId: true },
        });
        if (dbUser) {
          token.workspaceId = dbUser.workspaceId;
        }
      }

      return token;
    },
  },
  events: {
    async createUser({ user }) {
      // Auto-create workspace for new OAuth users in tenant schema
      if (user.id && user.email) {
        // For self-hosted, use the "default" organization with tenant_default schema
        let organization = await prisma.organization.findUnique({
          where: { schemaName: 'tenant_default' },
        });

        if (!organization) {
          // Create default organization for self-hosted
          organization = await prisma.organization.create({
            data: {
              name: 'Default Organization',
              slug: 'default',
              schemaName: 'tenant_default',
            },
          });
        }

        // Ensure tenant schema exists
        const schemaExists = await tenantSchemaExists('tenant_default');
        if (!schemaExists) {
          await createTenantSchema('default');
        }

        // Check if this is the first member (make them OWNER)
        const memberCount = await prisma.organizationMember.count({
          where: { organizationId: organization.id },
        });

        // Add user as organization member
        await prisma.organizationMember.create({
          data: {
            organizationId: organization.id,
            userId: user.id,
            role: memberCount === 0 ? 'OWNER' : 'MEMBER',
            joinedAt: new Date(),
          },
        });

        // Create workspace in tenant schema
        const workspaceSlug = user.email
          .split('@')[0]
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '-');
        const uniqueSlug = `${workspaceSlug}-${Date.now().toString(36)}`;

        await withTenantSchema('tenant_default', async (client) => {
          // Create workspace
          const workspaceResult = await client.query(
            `INSERT INTO workspaces (name, slug)
             VALUES ($1, $2)
             RETURNING id`,
            [user.name ? `${user.name}'s Workspace` : 'My Workspace', uniqueSlug]
          );
          const workspaceId = workspaceResult.rows[0].id;

          // Create workspace member
          await client.query(
            `INSERT INTO workspace_members (workspace_id, user_id, role)
             VALUES ($1, $2, $3)`,
            [workspaceId, user.id, 'OWNER']
          );
        });
      }
    },
  },
});
