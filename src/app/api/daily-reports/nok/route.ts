import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET - Získat NOK hlášení (pro dispečera)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Neautorizováno' }, { status: 401 });
    }

    if (session.user.role !== 'DISPATCHER' && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Nedostatečná oprávnění' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const resolved = searchParams.get('resolved');

    const where: { carCheck: string; resolved?: boolean } = {
      carCheck: 'NOK',
    };

    if (resolved === 'true') {
      where.resolved = true;
    } else if (resolved === 'false') {
      where.resolved = false;
    }

    const reports = await prisma.dailyReport.findMany({
      where,
      include: {
        route: {
          select: {
            id: true,
            name: true,
            date: true,
            vehicle: { select: { id: true, name: true, spz: true } },
          },
        },
        driver: {
          select: { id: true, name: true, color: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Count of unresolved NOK reports
    const count = await prisma.dailyReport.count({
      where: { carCheck: 'NOK', resolved: false },
    });

    return NextResponse.json({ reports, count });
  } catch (error) {
    console.error('Chyba při načítání NOK hlášení:', error);
    return NextResponse.json({ error: 'Chyba serveru' }, { status: 500 });
  }
}

// PATCH - Označit NOK report jako vyřešený
export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Neautorizováno' }, { status: 401 });
    }

    if (session.user.role !== 'DISPATCHER' && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Nedostatečná oprávnění' }, { status: 403 });
    }

    const body = await request.json();
    const { reportId, resolved } = body;

    if (!reportId) {
      return NextResponse.json({ error: 'ID reportu je povinné' }, { status: 400 });
    }

    const report = await prisma.dailyReport.update({
      where: { id: reportId },
      data: { resolved: resolved ?? true },
    });

    return NextResponse.json(report);
  } catch (error) {
    console.error('Chyba při aktualizaci hlášení:', error);
    return NextResponse.json({ error: 'Chyba serveru' }, { status: 500 });
  }
}
