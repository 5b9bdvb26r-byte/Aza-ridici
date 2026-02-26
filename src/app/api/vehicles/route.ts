import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET - Získat všechna vozidla
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Neautorizováno' }, { status: 401 });
    }

    const vehicles = await prisma.vehicle.findMany({
      orderBy: { name: 'asc' },
    });

    // Načíst poslední endKm pro každé vozidlo z daily reportů (přes trasy)
    const vehicleIds = vehicles.map(v => v.id);
    const latestReports = await prisma.route.findMany({
      where: {
        vehicleId: { in: vehicleIds },
        dailyReport: {
          endKm: { not: null },
        },
      },
      select: {
        vehicleId: true,
        date: true,
        dailyReport: {
          select: {
            endKm: true,
          },
        },
      },
      orderBy: { date: 'desc' },
    });

    // Pro každé vozidlo najít nejnovější endKm
    const lastEndKmMap = new Map<string, number>();
    latestReports.forEach((route) => {
      if (route.vehicleId && route.dailyReport?.endKm && !lastEndKmMap.has(route.vehicleId)) {
        lastEndKmMap.set(route.vehicleId, route.dailyReport.endKm);
      }
    });

    // Přidat lastEndKm ke každému vozidlu
    const vehiclesWithEndKm = vehicles.map(v => ({
      ...v,
      lastEndKm: lastEndKmMap.get(v.id) || null,
    }));

    return NextResponse.json(vehiclesWithEndKm);
  } catch (error) {
    console.error('Chyba při načítání vozidel:', error);
    return NextResponse.json({ error: 'Chyba serveru' }, { status: 500 });
  }
}

// POST - Vytvořit nové vozidlo
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
    const { spz, name, oilLimitKm, adblueLimitKm, brakesLimitKm, bearingsLimitKm, brakeFluidLimitMonths, greenCardLimitMonths, fridexLimitMonths } = body;

    if (!spz || !name) {
      return NextResponse.json({ error: 'SPZ a název jsou povinné' }, { status: 400 });
    }

    const vehicle = await prisma.vehicle.create({
      data: {
        spz,
        name,
        oilLimitKm: oilLimitKm ? parseInt(oilLimitKm) : 15000,
        adblueLimitKm: adblueLimitKm ? parseInt(adblueLimitKm) : 10000,
        brakesLimitKm: brakesLimitKm ? parseInt(brakesLimitKm) : 60000,
        bearingsLimitKm: bearingsLimitKm ? parseInt(bearingsLimitKm) : 100000,
        brakeFluidLimitMonths: brakeFluidLimitMonths ? parseInt(brakeFluidLimitMonths) : 24,
        greenCardLimitMonths: greenCardLimitMonths ? parseInt(greenCardLimitMonths) : 12,
        fridexLimitMonths: fridexLimitMonths ? parseInt(fridexLimitMonths) : 24,
      },
    });

    return NextResponse.json(vehicle);
  } catch (error) {
    console.error('Chyba při vytváření vozidla:', error);
    return NextResponse.json({ error: 'Chyba serveru' }, { status: 500 });
  }
}
