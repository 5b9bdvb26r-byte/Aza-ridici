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
  email: string;
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

export default function StatisticsPage() {
  const [drivers, setDrivers] = useState<DriverStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedDriver, setExpandedDriver] = useState<string | null>(null);

  const fetchStatistics = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/statistics');
      if (!response.ok) {
        throw new Error('Chyba při načítání statistik');
      }
      const data = await response.json();
      setDrivers(data.drivers);
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

  // Celkové souhrny
  const totals = drivers.reduce(
    (acc, driver) => ({
      totalKm: acc.totalKm + driver.stats.totalKm,
      monthlyKm: acc.monthlyKm + driver.stats.monthlyKm,
      totalTrips: acc.totalTrips + driver.stats.totalTrips,
      monthlyTrips: acc.monthlyTrips + driver.stats.monthlyTrips,
      complaintCount: acc.complaintCount + (driver.stats.complaintCount || 0),
      totalRatingUp: acc.totalRatingUp + (driver.stats.ratingUp || 0),
      totalRatingDown: acc.totalRatingDown + (driver.stats.ratingDown || 0),
    }),
    { totalKm: 0, monthlyKm: 0, totalTrips: 0, monthlyTrips: 0, complaintCount: 0, totalRatingUp: 0, totalRatingDown: 0 }
  );

  // Průměrná délka jízdy celkově
  const totalAverageKm = totals.totalTrips > 0
    ? Math.round(totals.totalKm / totals.totalTrips)
    : 0;

  // Funkce pro získání ikony pozice
  const getPositionIcon = (index: number) => {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return `${index + 1}.`;
  };

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

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Statistiky řidičů</h1>
        <p className="text-gray-600 mt-1">
          Přehled najetých kilometrů a jízd - seřazeno podle najetých km
        </p>
      </div>

      {/* Celkový souhrn */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="card text-center">
          <div className="text-3xl font-bold text-gray-900">
            {totals.totalKm.toLocaleString('cs-CZ')}
          </div>
          <div className="text-sm text-gray-500">Celkem km</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl font-bold text-primary-600">
            {totals.monthlyKm.toLocaleString('cs-CZ')}
          </div>
          <div className="text-sm text-gray-500 capitalize">{currentMonth}</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl font-bold text-gray-900">
            {totals.totalTrips}
          </div>
          <div className="text-sm text-gray-500">Celkem jízd</div>
        </div>
        <div className="card text-center bg-yellow-50">
          <div className="text-3xl font-bold text-yellow-600">
            {totalAverageKm.toLocaleString('cs-CZ')}
          </div>
          <div className="text-sm text-gray-500">Průměr km/jízda</div>
        </div>
      </div>

      {/* Reklamace a hodnocení souhrn */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="card text-center bg-blue-50">
          <div className="text-3xl font-bold text-blue-600">
            {totals.complaintCount}
          </div>
          <div className="text-sm text-gray-500">Celkem vyřízených reklamací</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl font-bold">
            <span className="text-green-600">+{totals.totalRatingUp}</span>
            {' / '}
            <span className="text-red-600">-{totals.totalRatingDown}</span>
          </div>
          <div className="text-sm text-gray-500">Celkové hodnocení</div>
        </div>
      </div>

      {/* Seznam řidičů - seřazený podle km */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Žebříček řidičů podle najetých km</h2>
        {drivers.map((driver, index) => (
          <div key={driver.id} className="card">
            <button
              onClick={() => setExpandedDriver(
                expandedDriver === driver.id ? null : driver.id
              )}
              className="w-full text-left"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {/* Pozice */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                    index === 0 ? 'bg-yellow-100 text-yellow-700' :
                    index === 1 ? 'bg-gray-200 text-gray-600' :
                    index === 2 ? 'bg-orange-100 text-orange-700' :
                    'bg-gray-100 text-gray-500'
                  }`}>
                    {getPositionIcon(index)}
                  </div>
                  {/* Barva řidiče */}
                  <div
                    className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: driver.color || '#9CA3AF' }}
                  >
                    {driver.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 flex items-center gap-2">
                      {driver.name}
                      {(driver.stats.ratingUp > 0 || driver.stats.ratingDown > 0) && (
                        <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-gray-100">
                          <span className="text-green-600">+{driver.stats.ratingUp}</span>
                          {' / '}
                          <span className="text-red-600">-{driver.stats.ratingDown}</span>
                        </span>
                      )}
                      {driver.stats.complaintCount > 0 && (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">
                          📋 {driver.stats.complaintCount} rekl.
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">
                      Průměr: {driver.stats.averageKm.toLocaleString('cs-CZ')} km/jízda
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right hidden sm:block">
                    <div className="font-bold text-xl text-gray-900">
                      {driver.stats.totalKm.toLocaleString('cs-CZ')} km
                    </div>
                    <div className="text-sm text-gray-500">
                      {driver.stats.totalTrips} jízd
                    </div>
                  </div>
                  <div className="text-right hidden md:block">
                    <div className="font-semibold text-primary-600">
                      {driver.stats.monthlyKm.toLocaleString('cs-CZ')} km
                    </div>
                    <div className="text-sm text-gray-500">
                      {driver.stats.monthlyTrips} jízd tento měsíc
                    </div>
                  </div>
                  <div className="text-gray-400">
                    {expandedDriver === driver.id ? '▲' : '▼'}
                  </div>
                </div>
              </div>
            </button>

            {expandedDriver === driver.id && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="text-xl font-bold text-gray-900">
                      {driver.stats.totalKm.toLocaleString('cs-CZ')}
                    </div>
                    <div className="text-sm text-gray-500">Celkem km</div>
                  </div>
                  <div className="bg-yellow-50 p-3 rounded-lg">
                    <div className="text-xl font-bold text-yellow-600">
                      {driver.stats.averageKm.toLocaleString('cs-CZ')}
                    </div>
                    <div className="text-sm text-gray-500">Průměr km/jízda</div>
                  </div>
                  <div className="bg-primary-50 p-3 rounded-lg">
                    <div className="text-xl font-bold text-primary-600">
                      {driver.stats.monthlyKm.toLocaleString('cs-CZ')}
                    </div>
                    <div className="text-sm text-gray-500">Km tento měsíc</div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="text-xl font-bold text-gray-900">
                      {driver.stats.totalTrips}
                    </div>
                    <div className="text-sm text-gray-500">Jízd celkem</div>
                  </div>
                </div>

                {/* Reklamace a hodnocení */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <div className="text-xl font-bold text-blue-600">
                      📋 {driver.stats.complaintCount || 0}
                    </div>
                    <div className="text-sm text-gray-500">Vyřízených reklamací</div>
                  </div>
                  <div className="p-3 rounded-lg bg-gray-50">
                    <div className="text-xl font-bold">
                      <span className="text-green-600">+{driver.stats.ratingUp || 0}</span>
                      {' / '}
                      <span className="text-red-600">-{driver.stats.ratingDown || 0}</span>
                    </div>
                    <div className="text-sm text-gray-500">Hodnocení</div>
                  </div>
                </div>

                {driver.stats.vehicles.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">
                      Používaná vozidla
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {driver.stats.vehicles.map((vehicle) => (
                        <div
                          key={vehicle.spz}
                          className="px-3 py-1.5 bg-gray-100 rounded-lg text-sm"
                        >
                          <span className="font-medium">{vehicle.spz}</span>
                          <span className="text-gray-500 ml-1">
                            ({vehicle.name})
                          </span>
                          <span className="text-gray-400 ml-2">
                            {vehicle.trips}x
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {driver.stats.vehicles.length === 0 && driver.stats.totalTrips === 0 && (
                  <p className="text-gray-500 text-sm">
                    Tento řidič zatím nemá žádné přiřazené trasy
                  </p>
                )}
              </div>
            )}
          </div>
        ))}

        {drivers.length === 0 && (
          <div className="card text-center py-8">
            <p className="text-gray-500">Žádní řidiči v systému</p>
          </div>
        )}
      </div>
    </div>
  );
}
