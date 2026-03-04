import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST - Přidat km nebo resetovat počítadlo
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Neautorizováno' }, { status: 401 });
    }

    if (!['DISPATCHER', 'ADMIN', 'WAREHOUSE'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Nedostatečná oprávnění' }, { status: 403 });
    }

    const body = await request.json();
    const { action, type, km, date } = body;

    // action: 'add' (přidat km), 'reset' (resetovat počítadlo), 'setDate' (nastavit datum)
    // type: 'oil', 'adblue', 'brakes', 'bearings', 'brakeFluid', 'technical'

    const vehicle = await prisma.vehicle.findUnique({
      where: { id: params.id },
    });

    if (!vehicle) {
      return NextResponse.json({ error: 'Vozidlo nenalezeno' }, { status: 404 });
    }

    const updateData: Record<string, number | Date> = {};

    if (action === 'reset') {
      // Reset = zapamatovat aktuální km jako "poslední výměnu" + nastavit nový cíl
      const curKm = vehicle.currentKm || 0;
      if (type === 'oil') {
        updateData.oilLastKm = curKm;
        updateData.oilKm = curKm + vehicle.oilLimitKm;
        updateData.oilLastReset = new Date();
      } else if (type === 'adblue') {
        updateData.adblueLastKm = curKm;
        updateData.adblueKm = curKm + vehicle.adblueLimitKm;
        updateData.adblueLastReset = new Date();
      } else if (type === 'brakes') {
        updateData.brakesLastKm = curKm;
        updateData.brakesKm = curKm + vehicle.brakesLimitKm;
        updateData.brakesLastReset = new Date();
      } else if (type === 'bearings') {
        updateData.bearingsLastKm = curKm;
        updateData.bearingsKm = curKm + vehicle.bearingsLimitKm;
        updateData.bearingsLastReset = new Date();
      }
    } else if (action === 'setTarget' && km && type) {
      // Nastavit km poslední výměny → cíl = lastKm + interval
      const lastKm = parseInt(km);
      if (type === 'oil') { updateData.oilLastKm = lastKm; updateData.oilKm = lastKm + vehicle.oilLimitKm; updateData.oilLastReset = new Date(); }
      else if (type === 'adblue') { updateData.adblueLastKm = lastKm; updateData.adblueKm = lastKm + vehicle.adblueLimitKm; updateData.adblueLastReset = new Date(); }
      else if (type === 'brakes') { updateData.brakesLastKm = lastKm; updateData.brakesKm = lastKm + vehicle.brakesLimitKm; updateData.brakesLastReset = new Date(); }
      else if (type === 'bearings') { updateData.bearingsLastKm = lastKm; updateData.bearingsKm = lastKm + vehicle.bearingsLimitKm; updateData.bearingsLastReset = new Date(); }
    } else if (action === 'setDate' && date) {
      // Nastavit datum
      if (type === 'technical') {
        updateData.technicalInspectionDate = new Date(date);
      } else if (type === 'greenCard') {
        updateData.greenCardDate = new Date(date);
      } else if (type === 'highwayVignette') {
        updateData.highwayVignetteDate = new Date(date);
      } else if (type === 'brakeFluid') {
        // datum = poslední výměna → expirace = lastDate + limitMonths
        const lastDate = new Date(date);
        const expirationDate = new Date(lastDate);
        expirationDate.setMonth(expirationDate.getMonth() + vehicle.brakeFluidLimitMonths);
        updateData.brakeFluidLastDate = lastDate;
        updateData.brakeFluidDate = expirationDate;
      } else if (type === 'fridex') {
        // datum = poslední výměna → expirace = lastDate + limitMonths
        const lastDate = new Date(date);
        const expirationDate = new Date(lastDate);
        expirationDate.setMonth(expirationDate.getMonth() + vehicle.fridexLimitMonths);
        updateData.fridexLastDate = lastDate;
        updateData.fridexDate = expirationDate;
      }
    }

    const updatedVehicle = await prisma.vehicle.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json(updatedVehicle);
  } catch (error) {
    console.error('Chyba při údržbě vozidla:', error);
    return NextResponse.json({ error: 'Chyba serveru' }, { status: 500 });
  }
}
