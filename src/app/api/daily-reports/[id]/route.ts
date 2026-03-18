import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// PUT - Editovat denní report (dispečer)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Neautorizováno' }, { status: 401 });
    }

    if (!['DISPATCHER', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Nedostatečná oprávnění' }, { status: 403 });
    }

    const body = await request.json();
    const { endKm, fuelCost, adblueCost, carWashCost, avgConsumption, carCheck, carCheckNote } = body;

    const existingReport = await prisma.dailyReport.findUnique({
      where: { id: params.id },
      include: { route: { include: { vehicle: true } } },
    });

    if (!existingReport) {
      return NextResponse.json({ error: 'Report nenalezen' }, { status: 404 });
    }

    const updateData: Record<string, number | string | null | Date> = {};

    if (endKm !== undefined) {
      const endKmValue = parseInt(endKm);
      const vehicle = existingReport.route.vehicle;
      // Přepočítat ujeté km z rozdílu předchozího stavu tachometru
      // Použijeme starý endKm a aktuální currentKm vozidla k výpočtu previousKm
      const previousKm = vehicle ? (vehicle.currentKm - (existingReport.endKm || 0) + (existingReport.endKm || 0) - existingReport.actualKm) : 0;
      updateData.endKm = endKmValue;
      updateData.actualKm = Math.max(0, endKmValue - previousKm);
    }

    if (fuelCost !== undefined) updateData.fuelCost = parseFloat(fuelCost) || 0;
    if (adblueCost !== undefined) updateData.adblueCost = parseFloat(adblueCost) || 0;
    if (carWashCost !== undefined) updateData.carWashCost = parseFloat(carWashCost) || 0;
    if (avgConsumption !== undefined) updateData.avgConsumption = avgConsumption ? parseFloat(avgConsumption) : null;
    if (carCheck !== undefined) updateData.carCheck = carCheck;
    if (carCheckNote !== undefined) updateData.carCheckNote = carCheckNote || null;

    const updatedReport = await prisma.dailyReport.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json(updatedReport);
  } catch (error) {
    console.error('Chyba při editaci reportu:', error);
    return NextResponse.json({ error: 'Chyba serveru' }, { status: 500 });
  }
}
