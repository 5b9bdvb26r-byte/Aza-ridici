import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// PUT - Upravit vozidlo
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Neautorizováno' }, { status: 401 });
    }

    if (session.user.role !== 'DISPATCHER' && session.user.role !== 'ADMIN' && session.user.role !== 'WAREHOUSE') {
      return NextResponse.json({ error: 'Nedostatečná oprávnění' }, { status: 403 });
    }

    const body = await request.json();
    const { spz, name, currentKm, oilLimitKm, adblueLimitKm, brakesLimitKm, bearingsLimitKm, greenCardLimitMonths, brakeFluidLimitMonths, fridexLimitMonths } = body;

    const updateData: {
      spz?: string;
      name?: string;
      currentKm?: number;
      oilLimitKm?: number;
      adblueLimitKm?: number;
      brakesLimitKm?: number;
      bearingsLimitKm?: number;
      greenCardLimitMonths?: number;
      brakeFluidLimitMonths?: number;
      fridexLimitMonths?: number;
    } = {};

    if (spz !== undefined) updateData.spz = spz;
    if (name !== undefined) updateData.name = name;
    if (currentKm !== undefined) updateData.currentKm = parseInt(currentKm);
    if (oilLimitKm !== undefined) updateData.oilLimitKm = parseInt(oilLimitKm);
    if (adblueLimitKm !== undefined) updateData.adblueLimitKm = parseInt(adblueLimitKm);
    if (brakesLimitKm !== undefined) updateData.brakesLimitKm = parseInt(brakesLimitKm);
    if (bearingsLimitKm !== undefined) updateData.bearingsLimitKm = parseInt(bearingsLimitKm);
    if (greenCardLimitMonths !== undefined) updateData.greenCardLimitMonths = parseInt(greenCardLimitMonths);
    if (brakeFluidLimitMonths !== undefined) updateData.brakeFluidLimitMonths = parseInt(brakeFluidLimitMonths);
    if (fridexLimitMonths !== undefined) updateData.fridexLimitMonths = parseInt(fridexLimitMonths);

    const vehicle = await prisma.vehicle.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json(vehicle);
  } catch (error) {
    console.error('Chyba při úpravě vozidla:', error);
    return NextResponse.json({ error: 'Chyba serveru' }, { status: 500 });
  }
}

// DELETE - Smazat vozidlo
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Neautorizováno' }, { status: 401 });
    }

    if (session.user.role !== 'DISPATCHER' && session.user.role !== 'ADMIN' && session.user.role !== 'WAREHOUSE') {
      return NextResponse.json({ error: 'Nedostatečná oprávnění' }, { status: 403 });
    }

    await prisma.vehicle.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Chyba při mazání vozidla:', error);
    return NextResponse.json({ error: 'Chyba serveru' }, { status: 500 });
  }
}
