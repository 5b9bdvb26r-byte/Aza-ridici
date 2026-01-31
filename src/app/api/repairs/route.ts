import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET - Získat všechny opravy (volitelně pro konkrétní vozidlo)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Neautorizováno' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const vehicleId = searchParams.get('vehicleId');

    const where = vehicleId ? { vehicleId } : {};

    const repairs = await prisma.repair.findMany({
      where,
      include: {
        vehicle: {
          select: {
            id: true,
            spz: true,
            name: true,
          },
        },
      },
      orderBy: { date: 'desc' },
    });

    return NextResponse.json(repairs);
  } catch (error) {
    console.error('Chyba při načítání oprav:', error);
    return NextResponse.json({ error: 'Chyba serveru' }, { status: 500 });
  }
}

// POST - Vytvořit novou opravu
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Neautorizováno' }, { status: 401 });
    }

    if (session.user.role !== 'DISPATCHER' && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Nedostatečná oprávnění' }, { status: 403 });
    }

    const body = await request.json();
    const { vehicleId, description, price, note, date } = body;

    if (!vehicleId || !description) {
      return NextResponse.json(
        { error: 'Vozidlo a popis opravy jsou povinné' },
        { status: 400 }
      );
    }

    const repair = await prisma.repair.create({
      data: {
        vehicleId,
        description,
        price: price ? parseFloat(price) : null,
        note: note || null,
        date: date ? new Date(date) : new Date(),
      },
      include: {
        vehicle: {
          select: {
            id: true,
            spz: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(repair, { status: 201 });
  } catch (error) {
    console.error('Chyba při vytváření opravy:', error);
    return NextResponse.json({ error: 'Chyba serveru' }, { status: 500 });
  }
}
