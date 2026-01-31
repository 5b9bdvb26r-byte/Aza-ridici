'use client';

import { signOut, useSession } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export function Header() {
  const { data: session } = useSession();
  const pathname = usePathname();

  const isDispatcher =
    session?.user?.role === 'DISPATCHER' || session?.user?.role === 'ADMIN';

  const NavLink = ({
    href,
    children,
  }: {
    href: string;
    children: React.ReactNode;
  }) => {
    const isActive = pathname === href;
    return (
      <Link
        href={href}
        className={cn(
          'px-3 py-2 rounded-md text-sm font-medium transition-colors',
          isActive
            ? 'bg-gray-100 text-gray-900'
            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
        )}
      >
        {children}
      </Link>
    );
  };

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Logo uprostřed nahoře */}
        <div className="flex justify-center py-3 border-b border-gray-100">
          <Link href="/" className="flex items-center space-x-3">
            <Image
              src="/logo-aza.jpeg"
              alt="AZA Logo"
              width={50}
              height={50}
              className="rounded"
            />
            <span className="text-2xl font-bold text-gray-900">
              AZA Řidiči
            </span>
          </Link>
        </div>

        {/* Navigace a uživatelské info */}
        <div className="flex justify-between items-center h-12">
          <nav className="flex space-x-2">
            {isDispatcher ? (
              <>
                <NavLink href="/dispecer">Přehled řidičů</NavLink>
                <NavLink href="/dispecer/trasy">Trasy</NavLink>
                <NavLink href="/dispecer/vozidla">Vozidla</NavLink>
                <NavLink href="/dispecer/ridici">Řidiči</NavLink>
                <NavLink href="/dispecer/statistiky">Statistiky</NavLink>
                <NavLink href="/dispecer/poznamky">Poznámky</NavLink>
              </>
            ) : (
              <>
                <NavLink href="/ridic">Dostupnost</NavLink>
                <NavLink href="/ridic/trasy">Moje trasy</NavLink>
              </>
            )}
          </nav>

          <div className="flex items-center space-x-4">
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
      </div>
    </header>
  );
}
