'use client';

import { useState, useEffect } from 'react';
import { signOut, useSession } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export function Header() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [nokCount, setNokCount] = useState(0);
  const [pendingRoutes, setPendingRoutes] = useState(0);

  const isDispatcher =
    session?.user?.role === 'DISPATCHER' || session?.user?.role === 'ADMIN';

  // Auto-complete routes on page load (once per session)
  useEffect(() => {
    if (!session?.user?.id) return;
    const key = `autoComplete_${new Date().toDateString()}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, '1');
    fetch('/api/routes/auto-complete', { method: 'POST' }).catch(() => {});
  }, [session?.user?.id]);

  // Fetch pending routes count for driver badge
  useEffect(() => {
    if (isDispatcher || !session?.user?.id) return;

    const fetchPendingCount = async () => {
      try {
        const response = await fetch('/api/routes/pending-count');
        if (response.ok) {
          const data = await response.json();
          setPendingRoutes(data.count);
        }
      } catch {
        // silently fail
      }
    };

    fetchPendingCount();
    const interval = setInterval(fetchPendingCount, 60000);
    return () => clearInterval(interval);
  }, [isDispatcher, session?.user?.id]);

  // Fetch NOK report count for dispatcher badge
  useEffect(() => {
    if (!isDispatcher) return;

    const fetchNokCount = async () => {
      try {
        const response = await fetch('/api/daily-reports/nok');
        if (response.ok) {
          const data = await response.json();
          setNokCount(data.count);
        }
      } catch {
        // silently fail
      }
    };

    fetchNokCount();
    // Refresh every 60 seconds
    const interval = setInterval(fetchNokCount, 60000);
    return () => clearInterval(interval);
  }, [isDispatcher]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const NavLink = ({
    href,
    children,
    badge,
  }: {
    href: string;
    children: React.ReactNode;
    badge?: number;
  }) => {
    const isActive = pathname === href;
    return (
      <Link
        href={href}
        className={cn(
          'px-3 py-2 rounded-md text-sm font-medium transition-colors relative',
          isActive
            ? 'bg-gray-100 text-gray-900'
            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
        )}
        onClick={() => setMobileMenuOpen(false)}
      >
        {children}
        {badge != null && badge > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </Link>
    );
  };

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Logo + hamburger row */}
        <div className="flex items-center justify-between py-3 border-b border-gray-100">
          {/* Hamburger button - mobile only */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            aria-label="Menu"
          >
            {mobileMenuOpen ? (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>

          {/* Logo - centered */}
          <Link href="/" className="flex items-center space-x-3">
            <Image
              src="/logo-aza.jpeg"
              alt="AZA Logo"
              width={40}
              height={40}
              className="rounded sm:w-[50px] sm:h-[50px]"
            />
            <span className="text-xl sm:text-2xl font-bold text-gray-900">
              AZA Řidiči
            </span>
          </Link>

          {/* User info - desktop only (mobile shows in menu) */}
          <div className="hidden md:flex items-center space-x-4">
            <span className="text-sm text-gray-600">
              {session?.user?.name}
              <span className="ml-2 text-xs bg-gray-100 px-2 py-1 rounded">
                {isDispatcher ? 'Dispečer' : 'Řidič'}
              </span>
            </span>
            <button
              onClick={() => signOut({ callbackUrl: '/prihlaseni' })}
              className="btn-secondary text-sm"
            >
              Odhlásit se
            </button>
          </div>

          {/* Spacer for mobile to balance hamburger */}
          <div className="w-10 md:hidden" />
        </div>

        {/* Desktop navigation */}
        <div className="hidden md:flex justify-between items-center h-12">
          <nav className="flex space-x-2">
            {isDispatcher ? (
              <>
                <NavLink href="/dispecer">Přehled řidičů</NavLink>
                <NavLink href="/dispecer/trasy">Trasy</NavLink>
                <NavLink href="/dispecer/prehled-tras">Přehled tras</NavLink>
                <NavLink href="/dispecer/vozidla">Vozidla</NavLink>
                <NavLink href="/dispecer/ridici">Řidiči</NavLink>
                <NavLink href="/dispecer/statistiky">Statistiky</NavLink>
                <NavLink href="/dispecer/poznamky">Poznámky</NavLink>
                <NavLink href="/dispecer/sklad">Sklad</NavLink>
                <NavLink href="/dispecer/hlaseni" badge={nokCount}>Hlášení</NavLink>
              </>
            ) : (
              <>
                <NavLink href="/ridic">Dostupnost</NavLink>
                <NavLink href="/ridic/trasy" badge={pendingRoutes}>Moje trasy</NavLink>
                <NavLink href="/ridic/hlaseni">Hlášení</NavLink>
                <NavLink href="/ridic/statistiky">Statistiky</NavLink>
              </>
            )}
          </nav>
        </div>

        {/* Mobile navigation menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-3 border-t border-gray-100">
            <nav className="flex flex-col space-y-1">
              {isDispatcher ? (
                <>
                  <NavLink href="/dispecer">Přehled řidičů</NavLink>
                  <NavLink href="/dispecer/trasy">Trasy</NavLink>
                  <NavLink href="/dispecer/prehled-tras">Přehled tras</NavLink>
                  <NavLink href="/dispecer/vozidla">Vozidla</NavLink>
                  <NavLink href="/dispecer/ridici">Řidiči</NavLink>
                  <NavLink href="/dispecer/statistiky">Statistiky</NavLink>
                  <NavLink href="/dispecer/poznamky">Poznámky</NavLink>
                  <NavLink href="/dispecer/sklad">Sklad</NavLink>
                  <NavLink href="/dispecer/hlaseni" badge={nokCount}>Hlášení</NavLink>
                </>
              ) : (
                <>
                  <NavLink href="/ridic">Dostupnost</NavLink>
                  <NavLink href="/ridic/trasy" badge={pendingRoutes}>Moje trasy</NavLink>
                  <NavLink href="/ridic/hlaseni">Hlášení</NavLink>
                  <NavLink href="/ridic/statistiky">Statistiky</NavLink>
                </>
              )}
            </nav>
            {/* User info in mobile menu */}
            <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
              <span className="text-sm text-gray-600">
                {session?.user?.name}
                <span className="ml-2 text-xs bg-gray-100 px-2 py-1 rounded">
                  {isDispatcher ? 'Dispečer' : 'Řidič'}
                </span>
              </span>
              <button
                onClick={() => signOut({ callbackUrl: '/prihlaseni' })}
                className="btn-secondary text-sm"
              >
                Odhlásit se
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
