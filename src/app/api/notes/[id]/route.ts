import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PUT(request: Request, { params }: { params: { id: string } }) {
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

    const data: { text: string; categoryId?: string } = { text: text.trim() };
    if (categoryId) {
      data.categoryId = categoryId;
    }

    const note = await prisma.note.update({
      where: { id: params.id },
      data,
      include: { category: { select: { id: true, name: true } } },
    });

    return NextResponse.json(note);
  } catch (error) {
    console.error('Chyba při úpravě poznámky:', error);
    return NextResponse.json({ error: 'Chyba serveru' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['DISPATCHER', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Neautorizováno' }, { status: 401 });
    }

    await prisma.note.delete({ where: { id: params.id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Chyba při mazání poznámky:', error);
    return NextResponse.json({ error: 'Chyba serveru' }, { status: 500 });
  }
}
