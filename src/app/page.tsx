import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/prihlaseni');
  }

  // Přesměrování dle role
  if (session.user.role === 'DRIVER') {
    redirect('/ridic');
  }

  if (session.user.role === 'WAREHOUSE') {
    redirect('/dispecer/vozidla');
  }

  // DISPATCHER, ADMIN jdou na /dispecer
  redirect('/dispecer');
}
