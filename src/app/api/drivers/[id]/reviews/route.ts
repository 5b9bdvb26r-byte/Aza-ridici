import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST - Upravit hodnocení řidiče (+1 nebo -1)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Neautorizováno' }, { status: 401 });
    }

    if (session.user.role !== 'DISPATCHER' && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Nedostatečná oprávnění' }, { status: 403 });
    }

    const body = await request.json();
    const { action } = body; // "up" (+1) nebo "down" (-1)

    if (!action || (action !== 'up' && action !== 'down')) {
      return NextResponse.json(
        { error: 'Akce musí být "up" nebo "down"' },
        { status: 400 }
      );
    }

    const increment = action === 'up' ? 1 : -1;

    const driver = await prisma.user.update({
      where: { id: params.id },
      data: {
        rating: { increment },
      },
      select: { id: true, name: true, rating: true },
    });

    return NextResponse.json(driver);
  } catch (error) {
    console.error('Chyba při úpravě hodnocení:', error);
    return NextResponse.json({ error: 'Chyba serveru' }, { status: 500 });
  }
}
