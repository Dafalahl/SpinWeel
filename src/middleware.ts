import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // We only protect routes starting with /admin
  if (pathname.startsWith('/admin')) {
    const isAuthenticated = request.cookies.get('admin_session')?.value === 'true';

    // If visiting the login page while already authenticated, redirect to admin dashboard
    if (pathname === '/admin/login') {
      if (isAuthenticated) {
        return NextResponse.redirect(new URL('/admin', request.url));
      }
      return NextResponse.next();
    }

    // If not authenticated and trying to access admin dashboard, redirect to login
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
  }

  return NextResponse.next();
}

// Config to specify which paths the middleware should run on
export const config = {
  matcher: ['/admin/:path*'],
};
