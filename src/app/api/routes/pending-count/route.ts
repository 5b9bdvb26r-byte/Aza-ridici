export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET - Počet tras, které vyžadují report od řidiče
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Neautorizováno' }, { status: 401 });
    }

    // Trasy přiřazené tomuto řidiči, které jsou dnes nebo v minulosti,
    // a nemají denní report (bez ohledu na status - i COMPLETED trasy bez reportu se počítají)
    const count = await prisma.route.count({
      where: {
        driverId: session.user.id,
        date: { lte: new Date() },
        dailyReport: null,
      },
    });

    return NextResponse.json({ count });
  } catch (error) {
    console.error('Chyba při počítání pending tras:', error);
    return NextResponse.json({ error: 'Chyba serveru' }, { status: 500 });
  }
}
