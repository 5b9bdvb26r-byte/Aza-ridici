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

    if (session.user.role !== 'DISPATCHER' && session.user.role !== 'ADMIN') {
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

    const updateData: {
      oilKm?: number;
      oilLastReset?: Date;
      adblueKm?: number;
      adblueLastReset?: Date;
      brakesKm?: number;
      brakesLastReset?: Date;
      bearingsKm?: number;
      bearingsLastReset?: Date;
      brakeFluidLastChange?: Date;
      greenCardDate?: Date;
      fridexLastChange?: Date;
      technicalInspectionDate?: Date;
    } = {};

    if (action === 'reset') {
      // Resetovat počítadlo
      if (type === 'oil') {
        updateData.oilKm = 0;
        updateData.oilLastReset = new Date();
      } else if (type === 'adblue') {
        updateData.adblueKm = 0;
        updateData.adblueLastReset = new Date();
      } else if (type === 'brakes') {
        updateData.brakesKm = 0;
        updateData.brakesLastReset = new Date();
      } else if (type === 'bearings') {
        updateData.bearingsKm = 0;
        updateData.bearingsLastReset = new Date();
      } else if (type === 'brakeFluid') {
        updateData.brakeFluidLastChange = new Date();
      }
    } else if (action === 'add' && km) {
      // Přidat km ke všem km počítadlům
      const addKm = parseInt(km);
      updateData.oilKm = vehicle.oilKm + addKm;
      updateData.adblueKm = vehicle.adblueKm + addKm;
      updateData.brakesKm = vehicle.brakesKm + addKm;
      updateData.bearingsKm = vehicle.bearingsKm + addKm;
    } else if (action === 'setDate' && date) {
      // Nastavit datum
      if (type === 'technical') {
        updateData.technicalInspectionDate = new Date(date);
      } else if (type === 'brakeFluid') {
        updateData.brakeFluidLastChange = new Date(date);
      } else if (type === 'greenCard') {
        updateData.greenCardDate = new Date(date);
      } else if (type === 'fridex') {
        updateData.fridexLastChange = new Date(date);
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
