export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { startOfMonth, endOfMonth } from 'date-fns';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Neautorizováno' }, { status: 401 });
    }

    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    // Řidič vidí jen své statistiky, dispečer vidí všechny
    const isDriver = session.user.role === 'DRIVER';
    const driverFilter = isDriver ? { role: 'DRIVER' as const, id: session.user.id } : { role: 'DRIVER' as const };

    // Načíst řidiče
    const drivers = await prisma.user.findMany({
      where: driverFilter,
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

    // Načíst všechny trasy najednou
    const allRoutes = await prisma.route.findMany({
      where: {
        driverId: { in: drivers.map(d => d.id) },
      },
      select: {
        id: true,
        driverId: true,
        actualKm: true,
        date: true,
        complaintCount: true,
        vehicleId: true,
        vehicle: {
          select: {
            id: true,
            spz: true,
            name: true,
          },
        },
      },
    });

    // Zpracovat statistiky pro každého řidiče
    const driversWithStats = drivers.map((driver) => {
      const driverRoutes = allRoutes.filter(r => r.driverId === driver.id);
      const monthlyRoutes = driverRoutes.filter(r => {
        const routeDate = new Date(r.date);
        return routeDate >= monthStart && routeDate <= monthEnd;
      });

      // Celkové km
      const totalKm = driverRoutes.reduce((sum, r) => sum + (r.actualKm || 0), 0);
      const monthlyKm = monthlyRoutes.reduce((sum, r) => sum + (r.actualKm || 0), 0);

      // Počet jízd
      const totalTrips = driverRoutes.length;
      const monthlyTrips = monthlyRoutes.length;

      // Průměrné km na jízdu
      const tripsWithKm = driverRoutes.filter(r => r.actualKm && r.actualKm > 0);
      const averageKm =
        tripsWithKm.length > 0
          ? Math.round(
              tripsWithKm.reduce((sum, r) => sum + (r.actualKm || 0), 0) / tripsWithKm.length
            )
          : 0;

      // Používaná vozidla
      const vehicleMap = new Map<string, { spz: string; name: string; trips: number }>();
      driverRoutes.forEach((route) => {
        if (route.vehicle) {
          const existing = vehicleMap.get(route.vehicle.id);
          if (existing) {
            existing.trips++;
          } else {
            vehicleMap.set(route.vehicle.id, {
              spz: route.vehicle.spz,
              name: route.vehicle.name,
              trips: 1,
            });
          }
        }
      });
      const vehicles = Array.from(vehicleMap.values()).sort((a, b) => b.trips - a.trips);

      // Reklamace
      const complaintCount = driverRoutes.reduce((sum, r) => sum + (r.complaintCount || 0), 0);

      // Rating (saldo)
      const rating = (driver.ratingUp || 0) - (driver.ratingDown || 0);

      return {
        id: driver.id,
        name: driver.name,
        email: driver.email,
        color: driver.color,
        stats: {
          totalKm,
          averageKm,
          monthlyKm,
          totalTrips,
          monthlyTrips,
          vehicles,
          complaintCount,
          rating,                 // saldo
          ratingUp: driver.ratingUp,
          ratingDown: driver.ratingDown,
        },
      };
    });

    // Seřadit řidiče podle celkových km (sestupně)
    driversWithStats.sort((a, b) => b.stats.totalKm - a.stats.totalKm);

    return NextResponse.json({ drivers: driversWithStats });
  } catch (error) {
    console.error('Chyba při načítání statistik:', error);
    return NextResponse.json({ error: 'Chyba serveru' }, { status: 500 });
  }
}