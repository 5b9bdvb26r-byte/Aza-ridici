import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import bcrypt from 'bcryptjs';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// PUT - Aktualizovat řidiče (pouze pro dispečera/admina)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Neautorizováno' }, { status: 401 });
    }

    // Kontrola role - pouze dispečer nebo admin
    if (session.user.role !== 'DISPATCHER' && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Nedostatečná oprávnění' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, color, password } = body;

    // Kontrola, zda řidič existuje
    const existingDriver = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingDriver) {
      return NextResponse.json({ error: 'Řidič nenalezen' }, { status: 404 });
    }

    if (existingDriver.role !== 'DRIVER') {
      return NextResponse.json({ error: 'Nelze upravit tohoto uživatele' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (color !== undefined) updateData.color = color;
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const updatedDriver = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        color: true,
      },
    });

    return NextResponse.json(updatedDriver);
  } catch (error) {
    console.error('Chyba při aktualizaci řidiče:', error);
    return NextResponse.json(
      { error: 'Chyba serveru' },
      { status: 500 }
    );
  }
}

// DELETE - Smazat řidiče (pouze pro dispečera/admina)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Neautorizováno' }, { status: 401 });
    }

    // Kontrola role - pouze dispečer nebo admin
    if (session.user.role !== 'DISPATCHER' && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Nedostatečná oprávnění' }, { status: 403 });
    }

    const { id } = await params;

    // Kontrola, zda řidič existuje
    const existingDriver = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingDriver) {
      return NextResponse.json({ error: 'Řidič nenalezen' }, { status: 404 });
    }

    if (existingDriver.role !== 'DRIVER') {
      return NextResponse.json({ error: 'Nelze smazat tohoto uživatele' }, { status: 400 });
    }

    await prisma.user.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Řidič byl smazán' });
  } catch (error) {
    console.error('Chyba při mazání řidiče:', error);
    return NextResponse.json(
      { error: 'Chyba serveru' },
      { status: 500 }
    );
  }
}
