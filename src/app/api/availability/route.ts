import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET - Získat dostupnost aktuálního uživatele
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Neautorizováno' }, { status: 401 });
    }

    const availability = await prisma.availability.findMany({
      where: { userId: session.user.id },
      orderBy: { date: 'asc' },
    });

    return NextResponse.json(availability);
  } catch (error) {
    console.error('Chyba při načítání dostupnosti:', error);
    return NextResponse.json(
      { error: 'Chyba serveru' },
      { status: 500 }
    );
  }
}

// POST - Nastavit dostupnost (dispečer může nastavit pro libovolného řidiče)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Neautorizováno' }, { status: 401 });
    }

    const body = await request.json();
    const { date, status, note, driverId } = body;

    if (!date) {
      return NextResponse.json(
        { error: 'Datum je povinné' },
        { status: 400 }
      );
    }

    // Dispečer může nastavit dostupnost pro konkrétního řidiče
    let targetUserId = session.user.id;

    if (driverId && (session.user.role === 'DISPATCHER' || session.user.role === 'ADMIN')) {
      targetUserId = driverId;
    }

    // Normalize date to UTC midnight to avoid timezone issues
    const dateObj = new Date(date);
    const normalizedDate = new Date(Date.UTC(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate()));

    // Pokud status je null, smazat záznam
    if (status === null) {
      await prisma.availability.deleteMany({
        where: {
          userId: targetUserId,
          date: normalizedDate,
        },
      });
      return NextResponse.json({ success: true });
    }

    // Upsert - vytvořit nebo aktualizovat
    const availability = await prisma.availability.upsert({
      where: {
        userId_date: {
          userId: targetUserId,
          date: normalizedDate,
        },
      },
      update: {
        status,
        note: note || null,
      },
      create: {
        userId: targetUserId,
        date: normalizedDate,
        status,
        note: note || null,
      },
    });

    return NextResponse.json(availability);
  } catch (error) {
    console.error('Chyba při ukládání dostupnosti:', error);
    return NextResponse.json(
      { error: 'Chyba serveru' },
      { status: 500 }
    );
  }
}
