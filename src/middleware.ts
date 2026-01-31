import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;

    // Pouze dispečer má přístup
    if (token?.role === 'DISPATCHER' || token?.role === 'ADMIN') {
      return NextResponse.next();
    }

    // Ostatní přesměrovat na přihlášení
    return NextResponse.redirect(new URL('/prihlaseni', req.url));
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: ['/dispecer/:path*'],
};
