import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Neautorizováno' }, { status: 401 });
    }

    const body = await request.json();
    const { text, categoryId, status } = body;

    // Pokud se mění jen status, text nemusí být povinný
    const data: { text?: string; categoryId?: string; status?: string | null } = {};

    if (text !== undefined) {
      if (!text || !text.trim()) {
        return NextResponse.json({ error: 'Text poznámky je povinný' }, { status: 400 });
      }
      data.text = text.trim();
    }
    if (categoryId) {
      data.categoryId = categoryId;
    }
    if (status !== undefined) {
      data.status = status; // null, "seen", "ok", "nok"
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
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Neautorizováno' }, { status: 401 });
    }

    await prisma.note.delete({ where: { id: params.id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Chyba při mazání poznámky:', error);
    return NextResponse.json({ error: 'Chyba serveru' }, { status: 500 });
  }
}
