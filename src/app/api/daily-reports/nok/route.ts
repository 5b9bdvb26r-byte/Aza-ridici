import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET - Získat hlášení (pro dispečera)
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
    const type = searchParams.get('type'); // 'nok', 'ok', 'all' (default: 'all')

    const where: { carCheck?: string; resolved?: boolean } = {};

    // Filtr typu
    if (type === 'nok') {
      where.carCheck = 'NOK';
    } else if (type === 'ok') {
      where.carCheck = 'OK';
    }
    // 'all' nebo bez type = žádný filtr na carCheck

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
    const nokCount = await prisma.dailyReport.count({
      where: { carCheck: 'NOK', resolved: false },
    });

    // Count of all reports
    const totalCount = await prisma.dailyReport.count();

    return NextResponse.json({ reports, count: nokCount, totalCount });
  } catch (error) {
    console.error('Chyba při načítání hlášení:', error);
    return NextResponse.json({ error: 'Chyba serveru' }, { status: 500 });
  }
}

// PATCH - Označit report jako vyřešený
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
