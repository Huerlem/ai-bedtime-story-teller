import { NextResponse } from 'next/server';

/**
 * Dream Tales V2 middleware.
 *
 * SECURITY: this middleware deliberately makes NO authorization decisions.
 * Earlier builds parsed an unsigned `user` JSON cookie and trusted its `role`
 * field; any visitor could forge it. Authorization is now enforced only where it
 * can be verified:
 *   - API routes: Firebase ID token verified with the Admin SDK (requireParent).
 *   - Data: Firestore and Storage security rules (family ownership, approval).
 *   - UI: client route guards (ProtectedRoute / useAuth) are UX only.
 *
 * The middleware removes the legacy cookie so stale role hints are not reused,
 * and adds baseline security headers.
 */
export function middleware(request) {
  const response = NextResponse.next();
  if (request.cookies.get('user')) {
    response.cookies.delete('user');
  }
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
};
