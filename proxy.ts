import NextAuth from 'next-auth';
import { authConfig } from '@/lib/auth/auth.config';

/**
 * Edge-safe middleware for route protection
 *
 * Uses the edge-compatible auth config (no Prisma, no bcrypt).
 * Authorization logic is in authConfig.callbacks.authorized
 *
 * Protected routes require authentication:
 * - /dashboard
 * - /projects
 * - /sources
 *
 * Public routes:
 * - / (landing page)
 * - /login
 * - /register
 * - /share/* (shareable links - read-only access)
 * - /api/auth/* (auth endpoints)
 * - /api/* (API routes handle their own auth)
 */
export const proxy = NextAuth(authConfig).auth;

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
