import NextAuth from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import GitHub from 'next-auth/providers/github';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import type { Adapter } from 'next-auth/adapters';
import './types';

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma) as Adapter,
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
    }),
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
    async session({ session, token }) {
      if (token) {
        session.user.id = (token.id as string) ?? '';
        // Legacy
        session.user.workspaceId = (token.workspaceId as string | null) ?? null;
        // Multi-tenant
        session.user.organizations =
          (token.organizations as typeof session.user.organizations) ?? [];
        session.user.currentOrgId = (token.currentOrgId as string | null) ?? null;
        session.user.currentOrgSlug = (token.currentOrgSlug as string | null) ?? null;
        session.user.currentSchemaName = (token.currentSchemaName as string | null) ?? null;
        session.user.currentRole = (token.currentRole as typeof session.user.currentRole) ?? null;
      }
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      // Auto-create workspace for new users (solo-first model)
      if (user.id && user.email) {
        const slug = user.email
          .split('@')[0]
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '-');
        const uniqueSlug = `${slug}-${Date.now().toString(36)}`;

        const workspace = await prisma.workspace.create({
          data: {
            name: user.name ? `${user.name}'s Workspace` : 'My Workspace',
            slug: uniqueSlug,
          },
        });

        await prisma.user.update({
          where: { id: user.id },
          data: { workspaceId: workspace.id },
        });
      }
    },
  },
});
