import type { NextAuthConfig } from 'next-auth';
import Google from 'next-auth/providers/google';
import GitHub from 'next-auth/providers/github';

/**
 * Edge-safe NextAuth configuration
 *
 * This config is used by middleware (runs in Edge runtime).
 * It contains only providers and settings that don't require Node.js APIs.
 *
 * DO NOT add here:
 * - PrismaAdapter (requires Node.js)
 * - Credentials provider (requires bcrypt)
 * - Database calls in callbacks
 */
export const authConfig: NextAuthConfig = {
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
  },
  providers: [
    // OAuth providers are edge-safe (just HTTP redirects)
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
    }),
    // NOTE: Credentials provider is added in index.ts (requires bcrypt)
  ],
  callbacks: {
    /**
     * Authorization callback for middleware
     * This runs in Edge runtime - no DB access allowed
     */
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;

      // Public routes that don't require authentication
      const publicRoutes = ['/', '/login', '/register'];
      const isPublicRoute =
        publicRoutes.includes(nextUrl.pathname) || nextUrl.pathname.startsWith('/share');

      // Auth API routes are always accessible
      const isAuthRoute = nextUrl.pathname.startsWith('/api/auth');

      // Static assets and API routes
      const isStaticOrApi =
        nextUrl.pathname.startsWith('/_next') ||
        nextUrl.pathname.startsWith('/api/') ||
        nextUrl.pathname.includes('.');

      // Allow public routes and auth routes
      if (isPublicRoute || isAuthRoute || isStaticOrApi) {
        return true;
      }

      // Protected routes - must be logged in
      return isLoggedIn;
    },

    /**
     * Session callback - edge-safe version
     * Just maps token data to session, no DB calls
     */
    session({ session, token }) {
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
};
