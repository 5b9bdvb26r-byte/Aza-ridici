import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { startOfDay } from 'date-fns';

// GET - Cron endpoint (volitelně bez autentizace pro automatické volání)
export async function GET(request: NextRequest) {
  // Povolit přístup z cron jobu nebo přihlášeným uživatelům
  const cronSecret = request.headers.get('x-cron-secret');
  const isValidCron = cronSecret === process.env.CRON_SECRET;

  if (!isValidCron) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Neautorizováno' }, { status: 401 });
    }
  }

  return autoCompleteRoutes();
}

// POST - Automaticky dokončit trasy, které mají datum v minulosti
export async function POST() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Neautorizováno' }, { status: 401 });
    }

    return autoCompleteRoutes();
  } catch (error) {
    console.error('Chyba při automatickém dokončování tras:', error);
    return NextResponse.json({ error: 'Chyba serveru' }, { status: 500 });
  }
}

async function autoCompleteRoutes() {
  try {
    const today = startOfDay(new Date());

    // Najít trasy, které:
    // - mají datum před dneškem
    // - nejsou dokončené
    // - MAJÍ vyplněný denní report (řidič už potvrdil)
    // - mají přiřazené vozidlo
    // Trasy BEZ reportu se NEsmí automaticky dokončit - řidič je musí nejdřív vyplnit!
    const routesToComplete = await prisma.route.findMany({
      where: {
        date: { lt: today },
        status: { not: 'COMPLETED' },
        dailyReport: { isNot: null }, // Jen trasy, kde řidič už vyplnil report
        vehicleId: { not: null },
      },
      include: {
        vehicle: true,
      },
    });

    let completedCount = 0;

    for (const route of routesToComplete) {
      await prisma.route.update({
        where: { id: route.id },
        data: { status: 'COMPLETED' },
      });
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
