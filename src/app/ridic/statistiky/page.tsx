'use client';

import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';

interface VehicleStats {
  spz: string;
  name: string;
  trips: number;
}

interface DriverStats {
  id: string;
  name: string;
  color: string | null;
  stats: {
    totalKm: number;
    averageKm: number;
    monthlyKm: number;
    totalTrips: number;
    monthlyTrips: number;
    vehicles: VehicleStats[];
    complaintCount: number;
    rating: number;
    ratingUp: number;
    ratingDown: number;
  };
}

export default function DriverStatisticsPage() {
  const [driver, setDriver] = useState<DriverStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatistics = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/statistics');
      if (!response.ok) {
        throw new Error('Chyba při načítání statistik');
      }
      const data = await response.json();
      // Řidič dostane pole se sebou samotným
      if (data.drivers && data.drivers.length > 0) {
        setDriver(data.drivers[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Neznámá chyba');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatistics();
  }, [fetchStatistics]);

  const currentMonth = format(new Date(), 'LLLL yyyy', { locale: cs });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Načítání...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
        {error}
      </div>
    );
  }

  if (!driver) {
    return (
      <div className="card py-12 text-center text-gray-500">
        Žádné statistiky k zobrazení
      </div>
    );
  }

  const stats = driver.stats;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Moje statistiky</h1>
        <p className="text-gray-600 mt-1">Přehled vašich najetých kilometrů a jízd</p>
      </div>

      {/* Hlavní čísla */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="card text-center">
          <div className="text-3xl font-bold text-gray-900">
            {stats.totalKm.toLocaleString('cs-CZ')}
          </div>
          <div className="text-sm text-gray-500">Celkem km</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl font-bold text-primary-600">
            {stats.monthlyKm.toLocaleString('cs-CZ')}
          </div>
          <div className="text-sm text-gray-500 capitalize">{currentMonth}</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl font-bold text-gray-900">
            {stats.totalTrips}
          </div>
          <div className="text-sm text-gray-500">Celkem jízd</div>
        </div>
        <div className="card text-center bg-yellow-50">
          <div className="text-3xl font-bold text-yellow-600">
            {stats.averageKm.toLocaleString('cs-CZ')}
          </div>
          <div className="text-sm text-gray-500">Průměr km/jízda</div>
        </div>
      </div>

      {/* Měsíční a hodnocení */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <div className="card text-center">
          <div className="text-3xl font-bold text-primary-600">
            {stats.monthlyTrips}
          </div>
          <div className="text-sm text-gray-500">Jízd tento měsíc</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl font-bold">
            <span className="text-green-600">+{stats.ratingUp || 0}</span>
            {' / '}
            <span className="text-red-600">-{stats.ratingDown || 0}</span>
          </div>
          <div className="text-sm text-gray-500">Hodnocení</div>
        </div>
        <div className="card text-center bg-blue-50">
          <div className="text-3xl font-bold text-blue-600">
            {stats.complaintCount}
          </div>
          <div className="text-sm text-gray-500">Reklamací</div>
        </div>
      </div>

      {/* Používaná vozidla */}
      {stats.vehicles.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Používaná vozidla
          </h2>
          <div className="space-y-3">
            {stats.vehicles.map((vehicle) => (
              <div
                key={vehicle.spz}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div>
                  <span className="font-bold text-gray-900 font-mono">{vehicle.spz}</span>
                  <span className="text-gray-500 ml-2">{vehicle.name}</span>
                </div>
                <div className="text-sm text-gray-600">
                  <span className="font-bold">{vehicle.trips}</span> {vehicle.trips === 1 ? 'jízda' : vehicle.trips < 5 ? 'jízdy' : 'jízd'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
