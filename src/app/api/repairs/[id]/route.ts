import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// PUT - Upravit opravu
export async function PUT(
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
    const { description, price, note, date } = body;

    const repair = await prisma.repair.update({
      where: { id: params.id },
      data: {
        description,
        price: price ? parseFloat(price) : null,
        note: note || null,
        date: date ? new Date(date) : undefined,
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

    return NextResponse.json(repair);
  } catch (error) {
    console.error('Chyba při úpravě opravy:', error);
    return NextResponse.json({ error: 'Chyba serveru' }, { status: 500 });
  }
}

// DELETE - Smazat opravu
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

    await prisma.repair.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Chyba při mazání opravy:', error);
    return NextResponse.json({ error: 'Chyba serveru' }, { status: 500 });
  }
}
