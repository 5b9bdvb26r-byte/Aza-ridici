export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import bcrypt from 'bcryptjs';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET - Získat seznam všech řidičů (přístupné všem přihlášeným)
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Neautorizováno' }, { status: 401 });
    }

    const drivers = await prisma.user.findMany({
      where: { role: 'DRIVER' },
      select: {
        id: true,
        name: true,
        email: true,
        color: true,
        ratingUp: true,
        ratingDown: true,
      },
      orderBy: { name: 'asc' },
    });

    const driversWithRating = drivers.map(d => ({
      ...d,
      rating: d.ratingUp - d.ratingDown,
    }));

    return NextResponse.json(driversWithRating);
  } catch (error) {
    console.error('Chyba při načítání řidičů:', error);
    return NextResponse.json(
      { error: 'Chyba serveru' },
      { status: 500 }
    );
  }
}

// POST - Vytvořit nového řidiče (pouze pro dispečera/admina)
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Neautorizováno' }, { status: 401 });
    }

    // Kontrola role - pouze dispečer nebo admin
    if (session.user.role !== 'DISPATCHER' && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Nedostatečná oprávnění' }, { status: 403 });
    }

    const body = await request.json();
    const { name, color, password } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Jméno je povinné' },
        { status: 400 }
      );
    }

    if (!password) {
      return NextResponse.json(
        { error: 'Heslo je povinné' },
        { status: 400 }
      );
    }

    // Generovat unikátní email pro řidiče (interní identifikátor)
    const slug = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-');
    const email = `${slug}-${Date.now()}@ridic.aza.cz`;

    const hashedPassword = await bcrypt.hash(password, 10);

    const driver = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: 'DRIVER',
        color: color || null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        color: true,
      },
    });

    return NextResponse.json(driver, { status: 201 });
  } catch (error) {
    console.error('Chyba při vytváření řidiče:', error);
    return NextResponse.json(
      { error: 'Chyba serveru' },
      { status: 500 }
    );
  }
}
