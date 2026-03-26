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
      // Km-based checks (alert when 1000 km or less remaining for oil/brakes/bearings, 100 km for AdBlue)
      const oilAlert = v.oilKm > 0 && (v.oilKm - v.currentKm) <= 1000;
      const adblueAlert = v.adblueLimitKm > 0 && v.adblueKm > 0 && (v.adblueKm - v.currentKm) <= 100;
      const brakesAlert = v.brakesKm > 0 && (v.brakesKm - v.currentKm) <= 1000;
      const bearingsAlert = v.bearingsKm > 0 && (v.bearingsKm - v.currentKm) <= 1000;

      // Date-based checks (14 days for brake fluid, fridex, green card, vignette; 60 days for STK)
      const daysUntil = (date: Date | null) => date ? Math.ceil((new Date(date).getTime() - now.getTime()) / 86400000) : null;
      const brakeFluidAlert = daysUntil(v.brakeFluidDate) !== null && daysUntil(v.brakeFluidDate)! <= 14;
      const fridexAlert = daysUntil(v.fridexDate) !== null && daysUntil(v.fridexDate)! <= 14;
      const greenCardAlert = daysUntil(v.greenCardDate) !== null && daysUntil(v.greenCardDate)! <= 14;
      const technicalAlert = daysUntil(v.technicalInspectionDate) !== null && daysUntil(v.technicalInspectionDate)! <= 60;
      const vignetteAlert = daysUntil(v.highwayVignetteDate) !== null && daysUntil(v.highwayVignetteDate)! <= 14;

      return oilAlert || adblueAlert || brakesAlert || bearingsAlert ||
        brakeFluidAlert || fridexAlert || greenCardAlert || technicalAlert || vignetteAlert;
    }).length;

    return NextResponse.json({ count });
  } catch (error) {
    console.error('Chyba při počítání alertů vozidel:', error);
    return NextResponse.json({ error: 'Chyba serveru' }, { status: 500 });
  }
}
