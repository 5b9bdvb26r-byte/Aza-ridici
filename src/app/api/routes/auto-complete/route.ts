import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { startOfDay } from 'date-fns';

// POST - Automaticky dokončit trasy, které mají datum v minulosti
export async function POST() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Neautorizováno' }, { status: 401 });
    }

    // Pouze dispečer nebo admin
    if (session.user.role !== 'DISPATCHER' && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Nedostatečná oprávnění' }, { status: 403 });
    }

    const today = startOfDay(new Date());

    // Najít všechny trasy, které:
    // - mají datum před dneškem
    // - nejsou dokončené (status !== 'COMPLETED')
    // - mají přiřazené vozidlo a mají plannedKm nebo actualKm
    const routesToComplete = await prisma.route.findMany({
      where: {
        date: { lt: today },
        status: { not: 'COMPLETED' },
        vehicleId: { not: null },
      },
      include: {
        vehicle: true,
      },
    });

    let completedCount = 0;

    // Dokončit každou trasu a připsat km k vozidlu
    for (const route of routesToComplete) {
      const kmToAdd = route.actualKm || route.plannedKm || 0;

      // Aktualizovat status trasy na COMPLETED
      await prisma.route.update({
        where: { id: route.id },
        data: { status: 'COMPLETED' },
      });

      // Pokud má km a vozidlo, připsat km
      if (kmToAdd > 0 && route.vehicleId) {
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

      completedCount++;
    }

    return NextResponse.json({
      success: true,
      completedCount,
      message: completedCount > 0
        ? `Automaticky dokončeno ${completedCount} tras`
        : 'Žádné trasy k automatickému dokončení',
    });
  } catch (error) {
    console.error('Chyba při automatickém dokončování tras:', error);
    return NextResponse.json({ error: 'Chyba serveru' }, { status: 500 });
  }
}
