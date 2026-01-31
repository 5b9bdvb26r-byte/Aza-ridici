import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['DISPATCHER', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Neautorizováno' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('categoryId');

    const notes = await prisma.note.findMany({
      where: categoryId ? { categoryId } : undefined,
      include: { category: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(notes);
  } catch (error) {
    console.error('Chyba při načítání poznámek:', error);
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
    const { text, categoryId } = body;

    if (!text || !text.trim()) {
      return NextResponse.json({ error: 'Text poznámky je povinný' }, { status: 400 });
    }

    if (!categoryId) {
      return NextResponse.json({ error: 'Kategorie je povinná' }, { status: 400 });
    }

    const note = await prisma.note.create({
      data: { text: text.trim(), categoryId },
      include: { category: { select: { id: true, name: true } } },
    });

    return NextResponse.json(note, { status: 201 });
  } catch (error) {
    console.error('Chyba při vytváření poznámky:', error);
    return NextResponse.json({ error: 'Chyba serveru' }, { status: 500 });
  }
}
