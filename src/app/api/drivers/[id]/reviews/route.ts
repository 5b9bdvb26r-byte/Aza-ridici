import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST - Upravit hodnocení řidiče (up/down)
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

    // Bezpečné načtení body
    const body = (await request.json().catch(() => null)) as { action?: unknown; note?: unknown } | null;
    const action = body?.action;

    if (action !== 'up' && action !== 'down') {
      return NextResponse.json(
        { error: 'Akce musí být "up" nebo "down"' },
        { status: 400 }
      );
    }

    const driverId = params.id;

    // Ověř, že uživatel existuje a je DRIVER
    const existing = await prisma.user.findUnique({
      where: { id: driverId },
      select: { id: true, role: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Řidič nenalezen' }, { status: 404 });
    }

    if (existing.role !== 'DRIVER') {
      return NextResponse.json({ error: 'Uživatel není řidič' }, { status: 400 });
    }

    // Volitelná poznámka k hodnocení
    const note =
      typeof body?.note === 'string' && body.note.trim().length > 0
        ? body.note.trim().slice(0, 500)
        : null;

    // Transakce: (1) uložit záznam hodnocení (2) navýšit čítač
    const [_, driver] = await prisma.$transaction([
      prisma.driverReview.create({
        data: {
          driverId,
          type: action,
          note,
        },
        select: { id: true },
      }),
      prisma.user.update({
        where: { id: driverId },
        data:
          action === 'up'
            ? { ratingUp: { increment: 1 } }
            : { ratingDown: { increment: 1 } },
        select: { id: true, name: true, ratingUp: true, ratingDown: true },
      }),
    ]);

    return NextResponse.json(driver);
  } catch (error) {
    console.error('Chyba při úpravě hodnocení:', error);
    return NextResponse.json({ error: 'Chyba serveru' }, { status: 500 });
  }
}

// DELETE - Reset hodnocení řidiče (po vyplacení bonusu/srážky)
export async function DELETE(
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

    const driverId = params.id;

    // Ověř, že uživatel existuje a je DRIVER
    const existing = await prisma.user.findUnique({
      where: { id: driverId },
      select: { id: true, role: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Řidič nenalezen' }, { status: 404 });
    }

    if (existing.role !== 'DRIVER') {
      return NextResponse.json({ error: 'Uživatel není řidič' }, { status: 400 });
    }

    // Transakce: (1) smazat všechny záznamy hodnocení (2) vynulovat čítače
    const [_, driver] = await prisma.$transaction([
      prisma.driverReview.deleteMany({
        where: { driverId },
      }),
      prisma.user.update({
        where: { id: driverId },
        data: {
          ratingUp: 0,
          ratingDown: 0,
        },
        select: { id: true, name: true, ratingUp: true, ratingDown: true },
      }),
    ]);

    return NextResponse.json(driver);
  } catch (error) {
    console.error('Chyba při resetu hodnocení:', error);
    return NextResponse.json({ error: 'Chyba serveru' }, { status: 500 });
  }
}
