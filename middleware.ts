import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

/**
 * Middleware for route protection
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
 * - /api/auth/* (auth endpoints)
 */
export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;

  // Public routes that don't require authentication
  const publicRoutes = ['/', '/login', '/register'];
  const isPublicRoute = publicRoutes.includes(nextUrl.pathname);

  // Auth API routes are always accessible
  const isAuthRoute = nextUrl.pathname.startsWith('/api/auth');

  // Static assets and API routes (except protected ones) are accessible
  const isStaticOrApi =
    nextUrl.pathname.startsWith('/_next') ||
    nextUrl.pathname.startsWith('/api/') ||
    nextUrl.pathname.includes('.');

  // Allow public routes and auth routes
  if (isPublicRoute || isAuthRoute) {
    // Redirect logged-in users away from login/register to dashboard
    if (isLoggedIn && (nextUrl.pathname === '/login' || nextUrl.pathname === '/register')) {
      return NextResponse.redirect(new URL('/dashboard', nextUrl));
    }
    return NextResponse.next();
  }

  // Allow static assets and API routes
  if (isStaticOrApi) {
    return NextResponse.next();
  }

  // Protected routes - redirect to login if not authenticated
  if (!isLoggedIn) {
    const loginUrl = new URL('/login', nextUrl);
    loginUrl.searchParams.set('callbackUrl', nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

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
