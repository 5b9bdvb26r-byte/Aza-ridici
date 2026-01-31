import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['DISPATCHER', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Neautorizováno' }, { status: 401 });
    }

    const categories = await prisma.noteCategory.findMany({
      include: { notes: { select: { id: true } } },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(categories);
  } catch (error) {
    console.error('Chyba při načítání kategorií:', error);
    return NextResponse.json({ error: 'Chyba serveru' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['DISPATCHER', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Neautorizováno' }, { status: 401 });
    }

    const body = await request.json();
    const { name } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Název kategorie je povinný' }, { status: 400 });
    }

    const category = await prisma.noteCategory.create({
      data: { name: name.trim() },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error('Chyba při vytváření kategorie:', error);
    return NextResponse.json({ error: 'Chyba serveru' }, { status: 500 });
  }
}
