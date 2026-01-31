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
    const { name } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Název kategorie je povinný' }, { status: 400 });
    }

    const category = await prisma.noteCategory.update({
      where: { id: params.id },
      data: { name: name.trim() },
    });

    return NextResponse.json(category);
  } catch (error) {
    console.error('Chyba při úpravě kategorie:', error);
    return NextResponse.json({ error: 'Chyba serveru' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['DISPATCHER', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Neautorizováno' }, { status: 401 });
    }

    await prisma.noteCategory.delete({ where: { id: params.id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Chyba při mazání kategorie:', error);
    return NextResponse.json({ error: 'Chyba serveru' }, { status: 500 });
  }
}
