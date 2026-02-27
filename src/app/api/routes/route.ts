import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET - Získat trasy
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Neautorizováno' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const driverId = searchParams.get('driverId');
    const start = searchParams.get('start');
    const end = searchParams.get('end');

    const where: {
      driverId?: string;
      date?: { gte?: Date; lte?: Date };
    } = {};

    // Pokud je řidič, zobrazit pouze jeho trasy
    if (session.user.role === 'DRIVER') {
      where.driverId = session.user.id;
    } else if (driverId) {
      where.driverId = driverId;
    }

    if (start && end) {
      where.date = {
        gte: new Date(start),
        lte: new Date(end),
      };
    }

    const routes = await prisma.route.findMany({
      where,
      include: {
        driver: { select: { id: true, name: true, color: true } },
        vehicle: { select: { id: true, name: true, spz: true, currentKm: true } },
        orders: { orderBy: { createdAt: 'asc' } },
        dailyReport: true,
      },
      orderBy: { date: 'asc' },
    });

    return NextResponse.json(routes);
  } catch (error) {
    console.error('Chyba při načítání tras:', error);
    return NextResponse.json({ error: 'Chyba serveru' }, { status: 500 });
  }
}

// POST - Vytvořit novou trasu
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
    const { name, mapUrl, plannedKm, date, driverId, vehicleId, note, complaintCount, fuelCost, driverPay, orders } = body;

    if (!name || !date) {
      return NextResponse.json(
        { error: 'Název a datum jsou povinné' },
        { status: 400 }
      );
    }

    const route = await prisma.route.create({
      data: {
        name,
        mapUrl: mapUrl || null,
        plannedKm: plannedKm ? parseInt(plannedKm) : null,
        date: new Date(date),
        driverId: driverId || null,
        vehicleId: vehicleId || null,
        note: note || null,
        complaintCount: complaintCount ? parseInt(complaintCount) : 0,
        fuelCost: fuelCost ? parseFloat(fuelCost) : 0,
        driverPay: driverPay ? parseFloat(driverPay) : 0,
        orders: orders && orders.length > 0 ? {
          create: orders.map((o: { orderNumber: string; price: string; deliveryTime: string; deliveryTimeTo: string; note: string }) => ({
            orderNumber: o.orderNumber,
            price: o.price ? parseFloat(o.price) : 0,
            deliveryTime: o.deliveryTime || null,
            deliveryTimeTo: o.deliveryTimeTo || null,
            note: o.note || null,
          })),
        } : undefined,
      },
      include: {
        driver: { select: { id: true, name: true, color: true } },
        vehicle: { select: { id: true, name: true, spz: true, currentKm: true } },
        orders: { orderBy: { createdAt: 'asc' } },
      },
    });

    return NextResponse.json(route);
  } catch (error) {
    console.error('Chyba při vytváření trasy:', error);
    return NextResponse.json({ error: 'Chyba serveru' }, { status: 500 });
  }
}
