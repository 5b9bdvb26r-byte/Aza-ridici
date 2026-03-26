import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Neautorizováno' }, { status: 401 });
    }

    const vehicles = await prisma.vehicle.findMany();
    const now = new Date();

    const count = vehicles.filter((v) => {
      // Km-based checks
      const oilAlert = v.oilKm > 0 && v.currentKm >= v.oilKm;
      const adblueAlert = v.adblueLimitKm > 0 && v.adblueKm > 0 && v.currentKm >= v.adblueKm;
      const brakesAlert = v.brakesKm > 0 && v.currentKm >= v.brakesKm;
      const bearingsAlert = v.bearingsKm > 0 && v.currentKm >= v.bearingsKm;

      // Date-based checks
      const brakeFluidExpired = v.brakeFluidDate ? new Date(v.brakeFluidDate) <= now : false;
      const fridexExpired = v.fridexDate ? new Date(v.fridexDate) <= now : false;
      const greenCardExpired = v.greenCardDate ? new Date(v.greenCardDate) <= now : false;
      const technicalExpired = v.technicalInspectionDate ? new Date(v.technicalInspectionDate) <= now : false;
      const vignetteExpired = v.highwayVignetteDate ? new Date(v.highwayVignetteDate) <= now : false;

      return oilAlert || adblueAlert || brakesAlert || bearingsAlert ||
        brakeFluidExpired || fridexExpired || greenCardExpired || technicalExpired || vignetteExpired;
    }).length;

    return NextResponse.json({ count });
  } catch (error) {
    console.error('Chyba při počítání alertů vozidel:', error);
    return NextResponse.json({ error: 'Chyba serveru' }, { status: 500 });
  }
}
