import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;

    // Dispečerské stránky - pouze DISPATCHER/ADMIN
    if (pathname.startsWith('/dispecer')) {
      if (token?.role === 'DISPATCHER' || token?.role === 'ADMIN') {
        return NextResponse.next();
      }
      return NextResponse.redirect(new URL('/prihlaseni', req.url));
    }

    // Řidičovské stránky - pouze DRIVER
    if (pathname.startsWith('/ridic')) {
      if (token?.role === 'DRIVER') {
        return NextResponse.next();
      }
      return NextResponse.redirect(new URL('/prihlaseni', req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: ['/dispecer/:path*', '/ridic/:path*'],
};
