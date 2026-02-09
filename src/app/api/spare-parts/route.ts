export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET - Seznam všech náhradních dílů
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Neautorizováno' }, { status: 401 });
    }

    // Pouze dispečer nebo admin
    if (session.user.role !== 'DISPATCHER' && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Nedostatečná oprávnění' }, { status: 403 });
    }

    const spareParts = await prisma.sparePart.findMany({
      orderBy: { name: 'asc' },
      include: {
        movements: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            vehicle: {
              select: { id: true, spz: true, name: true },
            },
          },
        },
      },
    });

    return NextResponse.json(spareParts);
  } catch (error) {
    console.error('Chyba při načítání skladu:', error);
    return NextResponse.json({ error: 'Chyba serveru' }, { status: 500 });
  }
}

// POST - Přidat nový náhradní díl
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Neautorizováno' }, { status: 401 });
    }

    if (session.user.role !== 'DISPATCHER' && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Nedostatečná oprávnění' }, { status: 403 });
    }

    const body = await request.json();
    const { name, quantity, unit, minStock, note } = body;

    if (!name) {
      return NextResponse.json({ error: 'Název je povinný' }, { status: 400 });
    }

    const sparePart = await prisma.sparePart.create({
      data: {
        name,
        quantity: quantity || 0,
        unit: unit || 'ks',
        minStock: minStock || 0,
        note: note || null,
      },
    });

    // Pokud bylo zadáno počáteční množství, vytvořit příjmový pohyb
    if (quantity && quantity > 0) {
      await prisma.sparePartMovement.create({
        data: {
          sparePartId: sparePart.id,
          type: 'IN',
          quantity,
          note: 'Počáteční stav',
        },
      });
    }

    return NextResponse.json(sparePart, { status: 201 });
  } catch (error) {
    console.error('Chyba při vytváření dílu:', error);
    return NextResponse.json({ error: 'Chyba serveru' }, { status: 500 });
  }
}
