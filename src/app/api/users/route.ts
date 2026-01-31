import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Získat seznam všech uživatelů pro přihlašovací stránku
export async function GET() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        role: true,
      },
      orderBy: [
        { role: 'asc' },
        { name: 'asc' },
      ],
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error('Chyba při načítání uživatelů:', error);
    return NextResponse.json(
      { error: 'Chyba serveru' },
      { status: 500 }
    );
  }
}
