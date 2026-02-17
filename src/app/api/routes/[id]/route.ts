import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET - Získat detail trasy
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Neautorizováno' }, { status: 401 });
    }

    const route = await prisma.route.findUnique({
      where: { id: params.id },
      include: {
        driver: { select: { id: true, name: true } },
        vehicle: { select: { id: true, name: true, spz: true } },
      },
    });

    if (!route) {
      return NextResponse.json({ error: 'Trasa nenalezena' }, { status: 404 });
    }

    return NextResponse.json(route);
  } catch (error) {
    console.error('Chyba při načítání trasy:', error);
    return NextResponse.json({ error: 'Chyba serveru' }, { status: 500 });
  }
}

// PUT - Upravit trasu
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Neautorizováno' }, { status: 401 });
    }

    // Pouze dispečer může upravovat trasy
    if (session.user.role !== 'DISPATCHER' && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Nedostatečná oprávnění' }, { status: 403 });
    }

    const body = await request.json();
    const { name, mapUrl, plannedKm, actualKm, date, driverId, vehicleId, note, status, complaintCount, fuelCost, driverPay, orders } = body;

    // Načíst aktuální stav trasy
    const currentRoute = await prisma.route.findUnique({
      where: { id: params.id },
    });

    if (!currentRoute) {
      return NextResponse.json({ error: 'Trasa nenalezena' }, { status: 404 });
    }

    // Pokud přišly objednávky, smazat staré a vytvořit nové
    if (orders !== undefined) {
      await prisma.order.deleteMany({ where: { routeId: params.id } });
    }

    // Aktualizovat trasu
    const route = await prisma.route.update({
      where: { id: params.id },
      data: {
        name,
        mapUrl: mapUrl || null,
        plannedKm: plannedKm ? parseInt(plannedKm) : null,
        actualKm: actualKm ? parseInt(actualKm) : null,
        date: date ? new Date(date) : undefined,
        driverId: driverId || null,
        vehicleId: vehicleId || null,
        note: note || null,
        status: status || undefined,
        complaintCount: complaintCount !== undefined ? parseInt(complaintCount) : undefined,
        fuelCost: fuelCost !== undefined ? parseFloat(fuelCost) : undefined,
        driverPay: driverPay !== undefined ? parseFloat(driverPay) : undefined,
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
        vehicle: { select: { id: true, name: true, spz: true } },
        orders: { orderBy: { createdAt: 'asc' } },
      },
    });

    // Pokud se trasa právě dokončila (status změněn na COMPLETED)
    // a má přiřazené vozidlo a km, připsat km k vozidlu
    if (
      status === 'COMPLETED' &&
      currentRoute.status !== 'COMPLETED' &&
      route.vehicleId
    ) {
      const kmToAdd = route.actualKm || route.plannedKm || 0;

      if (kmToAdd > 0) {
        await prisma.vehicle.update({
          where: { id: route.vehicleId },
          data: {
            oilKm: { increment: kmToAdd },
            adblueKm: { increment: kmToAdd },
            brakesKm: { increment: kmToAdd },
            bearingsKm: { increment: kmToAdd },
          },
        });
      }
    }

    return NextResponse.json(route);
  } catch (error) {
    console.error('Chyba při úpravě trasy:', error);
    return NextResponse.json({ error: 'Chyba serveru' }, { status: 500 });
  }
}

// DELETE - Smazat trasu
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

    await prisma.route.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Chyba při mazání trasy:', error);
    return NextResponse.json({ error: 'Chyba serveru' }, { status: 500 });
  }
}
