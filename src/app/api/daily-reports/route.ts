import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET - Získat denní reporty řidiče
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Neautorizováno' }, { status: 401 });
    }

    const reports = await prisma.dailyReport.findMany({
      where: { driverId: session.user.id },
      include: {
        route: {
          select: {
            id: true,
            name: true,
            date: true,
            plannedKm: true,
            vehicle: { select: { id: true, name: true, spz: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(reports);
  } catch (error) {
    console.error('Chyba při načítání denních reportů:', error);
    return NextResponse.json({ error: 'Chyba serveru' }, { status: 500 });
  }
}

// POST - Vytvořit denní report (řidič)
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Neautorizováno' }, { status: 401 });
    }

    const body = await request.json();
    const { routeId, vehicleId, endKm, fuelCost, adblueCost, carWashCost, avgConsumption, carCheck, carCheckNote } = body;

    if (!routeId || !endKm || !vehicleId) {
      return NextResponse.json(
        { error: 'ID trasy, vozidlo a konečný stav km jsou povinné' },
        { status: 400 }
      );
    }

    // Ověřit, že trasa existuje a je přiřazena tomuto řidiči
    const route = await prisma.route.findUnique({
      where: { id: routeId },
      include: { vehicle: true, dailyReport: true },
    });

    if (!route) {
      return NextResponse.json({ error: 'Trasa nenalezena' }, { status: 404 });
    }

    if (route.driverId !== session.user.id) {
      return NextResponse.json(
        { error: 'Tato trasa není přiřazena vám' },
        { status: 403 }
      );
    }

    if (route.dailyReport) {
      return NextResponse.json(
        { error: 'Report pro tuto trasu již existuje' },
        { status: 400 }
      );
    }

    const endKmValue = parseInt(endKm);

    // Načíst vybrané vozidlo pro výpočet ujetých km
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: vehicleId },
    });

    const previousKm = vehicle?.currentKm || 0;
    const kmValue = Math.max(0, endKmValue - previousKm);

    // Vytvořit report a aktualizovat trasu v transakci
    const result = await prisma.$transaction(async (tx) => {
      const fuelCostValue = fuelCost ? parseFloat(fuelCost) : 0;
      const adblueCostValue = adblueCost ? parseFloat(adblueCost) : 0;
      const carWashCostValue = carWashCost ? parseFloat(carWashCost) : 0;
      const avgConsumptionValue = avgConsumption ? parseFloat(avgConsumption) : null;

      // Vytvořit denní report
      const report = await tx.dailyReport.create({
        data: {
          routeId,
          driverId: session.user.id,
          actualKm: kmValue,
          endKm: endKmValue,
          fuelCost: fuelCostValue,
          adblueCost: adblueCostValue,
          carWashCost: carWashCostValue,
          avgConsumption: avgConsumptionValue,
          carCheck: carCheck || 'OK',
          carCheckNote: carCheck === 'NOK' ? (carCheckNote || null) : null,
        },
      });

      // Aktualizovat trasu - přiřadit vozidlo, skutečné km, naftu, dokončit
      await tx.route.update({
        where: { id: routeId },
        data: {
          vehicleId: vehicleId,
          actualKm: kmValue,
          fuelCost: fuelCostValue,
          status: 'COMPLETED',
        },
      });

      // Aktualizovat stav tachometru vozidla
      await tx.vehicle.update({
        where: { id: vehicleId },
        data: {
          currentKm: endKmValue,
        },
      });

      return report;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Chyba při vytváření denního reportu:', error);
    return NextResponse.json({ error: 'Chyba serveru' }, { status: 500 });
  }
}
