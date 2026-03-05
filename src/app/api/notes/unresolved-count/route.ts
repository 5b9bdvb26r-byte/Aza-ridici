import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Neautorizováno' }, { status: 401 });
    }

    const count = await prisma.note.count({
      where: { status: null },
    });

    return NextResponse.json({ count });
  } catch (error) {
    console.error('Chyba při počítání nevyřízených poznámek:', error);
    return NextResponse.json({ error: 'Chyba serveru' }, { status: 500 });
  }
}
