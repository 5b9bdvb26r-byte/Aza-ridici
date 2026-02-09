import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST - Přidat pohyb (příjem nebo výdej)
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
    const { type, quantity, note, vehicleId } = body;

    if (!type || !['IN', 'OUT'].includes(type)) {
      return NextResponse.json({ error: 'Typ musí být IN nebo OUT' }, { status: 400 });
    }

    if (!quantity || quantity <= 0) {
      return NextResponse.json({ error: 'Množství musí být kladné číslo' }, { status: 400 });
    }

    // Ověřit existenci dílu
    const sparePart = await prisma.sparePart.findUnique({
      where: { id: params.id },
    });

    if (!sparePart) {
      return NextResponse.json({ error: 'Díl nenalezen' }, { status: 404 });
    }

    // Pro výdej ověřit dostatek na skladě
    if (type === 'OUT' && sparePart.quantity < quantity) {
      return NextResponse.json(
        { error: `Nedostatek na skladě. Dostupné: ${sparePart.quantity} ${sparePart.unit}` },
        { status: 400 }
      );
    }

    // Transakce - vytvořit pohyb a aktualizovat množství
    const [movement, updatedPart] = await prisma.$transaction([
      prisma.sparePartMovement.create({
        data: {
          sparePartId: params.id,
          type,
          quantity,
          note: note || null,
          vehicleId: vehicleId || null,
        },
        include: {
          vehicle: {
            select: { id: true, spz: true, name: true },
          },
        },
      }),
      prisma.sparePart.update({
        where: { id: params.id },
        data: {
          quantity: type === 'IN'
            ? { increment: quantity }
            : { decrement: quantity },
        },
      }),
    ]);

    return NextResponse.json({
      movement,
      newQuantity: updatedPart.quantity,
    });
  } catch (error) {
    console.error('Chyba při vytváření pohybu:', error);
    return NextResponse.json({ error: 'Chyba serveru' }, { status: 500 });
  }
}
