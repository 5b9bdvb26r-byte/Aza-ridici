import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;

    // Dispečerské stránky - DISPATCHER/ADMIN/WAREHOUSE
    if (pathname.startsWith('/dispecer')) {
      if (token?.role === 'DISPATCHER' || token?.role === 'ADMIN' || token?.role === 'WAREHOUSE') {
        // Skladník má omezený přístup - blokujeme trasy, zaměstnance, statistiky
        if (token?.role === 'WAREHOUSE') {
          const blocked = ['/dispecer/trasy', '/dispecer/zamestnanci', '/dispecer/statistiky', '/dispecer/ridici'];
          if (blocked.some(p => pathname.startsWith(p))) {
            return NextResponse.redirect(new URL('/dispecer', req.url));
          }
        }
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
