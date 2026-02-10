'use client';

import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { cs } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Driver {
  id: string;
  name: string;
  color?: string | null;
}

interface Vehicle {
  id: string;
  name: string;
  spz: string;
}

interface Order {
  id: string;
  orderNumber: string;
  price: number;
  deliveryTime: string | null;
  note: string | null;
}

interface DailyReport {
  id: string;
  actualKm: number;
  carCheck: string;
  carCheckNote: string | null;
  createdAt: string;
}

interface Route {
  id: string;
  name: string;
  mapUrl: string | null;
  plannedKm: number | null;
  actualKm: number | null;
  date: string;
  note: string | null;
  status: string;
  confirmed: boolean;
  complaintCount: number;
  fuelCost: number;
  driverPay: number;
  driver: Driver | null;
  vehicle: Vehicle | null;
  orders?: Order[];
  dailyReport?: DailyReport | null;
}

export default function PrehledTrasPage() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedRoute, setExpandedRoute] = useState<Set<string>>(new Set());
  const [filterDriver, setFilterDriver] = useState('');
  const [filterMonth, setFilterMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [drivers, setDrivers] = useState<Driver[]>([]);

  useEffect(() => {
    fetchDrivers();
  }, []);

  useEffect(() => {
    fetchRoutes();
  }, [filterMonth, filterDriver]);

  const fetchDrivers = async () => {
    try {
      const response = await fetch('/api/drivers');
      if (response.ok) {
        const data = await response.json();
        setDrivers(data);
      }
    } catch (error) {
      console.error('Chyba při načítání řidičů:', error);
    }
  };

  const fetchRoutes = async () => {
    setIsLoading(true);
    try {
      const [year, month] = filterMonth.split('-').map(Number);
      const start = startOfMonth(new Date(year, month - 1));
      const end = endOfMonth(new Date(year, month - 1));

      const params = new URLSearchParams({
        start: start.toISOString(),
        end: end.toISOString(),
      });

      if (filterDriver) {
        params.set('driverId', filterDriver);
      }

      const response = await fetch(`/api/routes?${params}`);
      if (response.ok) {
        const data = await response.json();
        // Zobrazit všechny trasy seřazené od nejnovějších
        setRoutes(data.sort((a: Route, b: Route) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      }
    } catch (error) {
      console.error('Chyba při načítání tras:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleExpand = (routeId: string) => {
    setExpandedRoute((prev) => {
      const next = new Set(prev);
      if (next.has(routeId)) {
        next.delete(routeId);
      } else {
        next.add(routeId);
      }
      return next;
    });
  };

  // Statistiky
  const completedRoutes = routes.filter((r) => r.status === 'COMPLETED');
  const totalOrders = completedRoutes.reduce(
    (sum, r) => sum + (r.orders?.length || 0),
    0
  );
  const totalRevenue = completedRoutes.reduce(
    (sum, r) => sum + (r.orders?.reduce((s, o) => s + (o.price || 0), 0) || 0),
    0
  );
  const totalFuel = completedRoutes.reduce((sum, r) => sum + (r.fuelCost || 0), 0);
  const totalDriverPay = completedRoutes.reduce((sum, r) => sum + (r.driverPay || 0), 0);
  const totalProfit = totalRevenue - totalFuel - totalDriverPay;
  const totalKm = completedRoutes.reduce((sum, r) => sum + (r.actualKm || r.plannedKm || 0), 0);

  // Generovat měsíce pro výběr (posledních 12 měsíců)
  const monthOptions = [];
  for (let i = 0; i < 12; i++) {
    const d = subMonths(new Date(), i);
    monthOptions.push({
      value: format(d, 'yyyy-MM'),
      label: format(d, 'LLLL yyyy', { locale: cs }),
    });
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Přehled tras</h1>
        <p className="text-gray-600 mt-1">Kompletní přehled všech tras s podrobnostmi</p>
      </div>

      {/* Filtry */}
      <div className="card mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Měsíc</label>
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="input capitalize"
            >
              {monthOptions.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Řidič</label>
            <select
              value={filterDriver}
              onChange={(e) => setFilterDriver(e.target.value)}
              className="input"
            >
              <option value="">Všichni řidiči</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Souhrnné statistiky */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <div className="bg-white rounded-lg border p-3 text-center">
          <div className="text-2xl font-bold text-gray-900">{routes.length}</div>
          <div className="text-xs text-gray-500">Celkem tras</div>
        </div>
        <div className="bg-white rounded-lg border p-3 text-center">
          <div className="text-2xl font-bold text-green-700">{completedRoutes.length}</div>
          <div className="text-xs text-gray-500">Dokončených</div>
        </div>
        <div className="bg-white rounded-lg border p-3 text-center">
          <div className="text-2xl font-bold text-gray-900">{totalOrders}</div>
          <div className="text-xs text-gray-500">Objednávek</div>
        </div>
        <div className="bg-white rounded-lg border p-3 text-center">
          <div className="text-2xl font-bold text-blue-700">{totalRevenue.toLocaleString('cs-CZ')}</div>
          <div className="text-xs text-gray-500">Tržby (Kč)</div>
        </div>
        <div className="bg-white rounded-lg border p-3 text-center">
          <div className="text-2xl font-bold text-red-600">{(totalFuel + totalDriverPay).toLocaleString('cs-CZ')}</div>
          <div className="text-xs text-gray-500">Náklady (Kč)</div>
        </div>
        <div className="bg-white rounded-lg border p-3 text-center">
          <div className={cn('text-2xl font-bold', totalProfit >= 0 ? 'text-green-700' : 'text-red-700')}>
            {totalProfit.toLocaleString('cs-CZ')}
          </div>
          <div className="text-xs text-gray-500">Zisk (Kč)</div>
        </div>
      </div>

      {/* Seznam tras */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500">Načítání...</div>
        </div>
      ) : routes.length === 0 ? (
        <div className="card py-12 text-center text-gray-500">
          Žádné trasy pro vybraný měsíc
        </div>
      ) : (
        <div className="space-y-3">
          {routes.map((route) => {
            const isExpanded = expandedRoute.has(route.id);
            const ordersTotal = route.orders?.reduce((sum, o) => sum + (o.price || 0), 0) || 0;
            const profit = ordersTotal - (route.fuelCost || 0) - (route.driverPay || 0);

            return (
              <div key={route.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                {/* Hlavní řádek - kliknutelný */}
                <button
                  onClick={() => toggleExpand(route.id)}
                  className="w-full text-left p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start gap-3 sm:gap-4">
                    {/* Datum */}
                    <div className="text-center min-w-[50px]">
                      <div className="text-xl font-bold text-gray-900">
                        {format(new Date(route.date), 'd')}
                      </div>
                      <div className="text-xs text-gray-500 uppercase">
                        {format(new Date(route.date), 'MMM', { locale: cs })}
                      </div>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-gray-900">{route.name}</span>
                        <span className={cn(
                          'px-2 py-0.5 rounded-full text-xs font-bold',
                          route.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                          route.status === 'IN_PROGRESS' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-blue-100 text-blue-700'
                        )}>
                          {route.status === 'COMPLETED' ? 'Hotovo' :
                           route.status === 'IN_PROGRESS' ? 'Probíhá' : 'Plán'}
                        </span>
                        {route.dailyReport && (
                          <span className={cn(
                            'px-2 py-0.5 rounded-full text-xs font-bold',
                            route.dailyReport.carCheck === 'OK'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          )}>
                            Report: {route.dailyReport.carCheck}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500 mt-1">
                        {route.driver ? (
                          <span className="flex items-center gap-1">
                            <span
                              className="w-3 h-3 rounded-full flex-shrink-0"
                              style={{ backgroundColor: route.driver.color || '#9CA3AF' }}
                            />
                            {route.driver.name}
                          </span>
                        ) : (
                          <span className="text-orange-600">Nepřiřazen</span>
                        )}
                        {route.vehicle && (
                          <span>{route.vehicle.name} ({route.vehicle.spz})</span>
                        )}
                        <span>{route.actualKm || route.plannedKm || 0} km</span>
                        {route.orders && route.orders.length > 0 && (
                          <span>{route.orders.length} obj.</span>
                        )}
                        {ordersTotal > 0 && (
                          <span className="font-medium text-gray-700">{ordersTotal.toLocaleString('cs-CZ')} Kč</span>
                        )}
                        {(ordersTotal > 0 || route.fuelCost > 0 || route.driverPay > 0) && (
                          <span className={cn('font-bold', profit >= 0 ? 'text-green-700' : 'text-red-700')}>
                            Zisk: {profit.toLocaleString('cs-CZ')} Kč
                          </span>
                        )}
                        {route.complaintCount > 0 && (
                          <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded-full">
                            {route.complaintCount} rekl.
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Šipka */}
                    <svg
                      className={cn('w-5 h-5 text-gray-400 transition-transform flex-shrink-0', isExpanded && 'rotate-180')}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {/* Rozbalený detail */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-gray-100">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
                      {/* Levý sloupec - Info o trase */}
                      <div className="space-y-3">
                        <h4 className="font-semibold text-gray-900 text-sm uppercase tracking-wide">Podrobnosti trasy</h4>

                        <div className="bg-gray-50 rounded-lg p-3 space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-500">Datum:</span>
                            <span className="font-medium">{format(new Date(route.date), 'd. MMMM yyyy (EEEE)', { locale: cs })}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Řidič:</span>
                            <span className="font-medium">{route.driver?.name || 'Nepřiřazen'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Vozidlo:</span>
                            <span className="font-medium">{route.vehicle ? `${route.vehicle.name} (${route.vehicle.spz})` : 'Nepřiřazeno'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Plánované km:</span>
                            <span className="font-medium">{route.plannedKm || '-'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Skutečné km:</span>
                            <span className="font-medium">{route.actualKm || '-'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Reklamace:</span>
                            <span className={cn('font-medium', route.complaintCount > 0 ? 'text-red-600' : 'text-gray-600')}>
                              {route.complaintCount}
                            </span>
                          </div>
                          {route.mapUrl && (
                            <div className="flex justify-between">
                              <span className="text-gray-500">Mapa:</span>
                              <a
                                href={route.mapUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary-600 hover:underline font-medium"
                              >
                                Otevřít mapu
                              </a>
                            </div>
                          )}
                          {route.note && (
                            <div className="pt-2 border-t border-gray-200">
                              <span className="text-gray-500">Poznámka:</span>
                              <p className="text-gray-700 mt-1">{route.note}</p>
                            </div>
                          )}
                        </div>

                        {/* Denní report */}
                        {route.dailyReport && (
                          <div>
                            <h4 className="font-semibold text-gray-900 text-sm uppercase tracking-wide mb-2">Denní report řidiče</h4>
                            <div className={cn(
                              'rounded-lg p-3 text-sm space-y-2',
                              route.dailyReport.carCheck === 'OK'
                                ? 'bg-green-50 border border-green-200'
                                : 'bg-red-50 border border-red-200'
                            )}>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Kontrola auta:</span>
                                <span className={cn(
                                  'font-bold',
                                  route.dailyReport.carCheck === 'OK' ? 'text-green-700' : 'text-red-700'
                                )}>
                                  {route.dailyReport.carCheck}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Skutečné km:</span>
                                <span className="font-medium">{route.dailyReport.actualKm} km</span>
                              </div>
                              {route.dailyReport.carCheckNote && (
                                <div className="pt-2 border-t border-red-200">
                                  <span className="text-red-700 font-medium">Problém: </span>
                                  <span className="text-red-600">{route.dailyReport.carCheckNote}</span>
                                </div>
                              )}
                              <div className="text-xs text-gray-400">
                                Odesláno: {format(new Date(route.dailyReport.createdAt), 'd.M.yyyy HH:mm', { locale: cs })}
                              </div>
                            </div>
                          </div>
                        )}

                        {!route.dailyReport && route.status === 'COMPLETED' && (
                          <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-700">
                            Řidič zatím neodevzdal denní report.
                          </div>
                        )}
                      </div>

                      {/* Pravý sloupec - Objednávky a finance */}
                      <div className="space-y-3">
                        {/* Objednávky */}
                        <h4 className="font-semibold text-gray-900 text-sm uppercase tracking-wide">Objednávky</h4>

                        {route.orders && route.orders.length > 0 ? (
                          <div className="bg-gray-50 rounded-lg overflow-hidden">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="bg-gray-100 text-gray-600">
                                  <th className="text-left py-2 px-3 font-medium">Číslo</th>
                                  <th className="text-right py-2 px-3 font-medium">Cena</th>
                                  <th className="text-left py-2 px-3 font-medium hidden sm:table-cell">Čas</th>
                                  <th className="text-left py-2 px-3 font-medium hidden sm:table-cell">Poznámka</th>
                                </tr>
                              </thead>
                              <tbody>
                                {route.orders.map((order) => (
                                  <tr key={order.id} className="border-t border-gray-200">
                                    <td className="py-2 px-3 font-mono text-gray-800">{order.orderNumber}</td>
                                    <td className="py-2 px-3 text-right font-medium">{order.price.toLocaleString('cs-CZ')} Kč</td>
                                    <td className="py-2 px-3 text-gray-500 hidden sm:table-cell">{order.deliveryTime || '-'}</td>
                                    <td className="py-2 px-3 text-gray-500 hidden sm:table-cell">{order.note || '-'}</td>
                                  </tr>
                                ))}
                                <tr className="border-t-2 border-gray-300 bg-gray-100 font-bold">
                                  <td className="py-2 px-3">Celkem</td>
                                  <td className="py-2 px-3 text-right">{ordersTotal.toLocaleString('cs-CZ')} Kč</td>
                                  <td className="py-2 px-3 hidden sm:table-cell" colSpan={2}></td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-500">
                            Žádné objednávky
                          </div>
                        )}

                        {/* Finanční souhrn */}
                        <h4 className="font-semibold text-gray-900 text-sm uppercase tracking-wide">Finanční souhrn</h4>
                        <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-2">
                          <div className="flex justify-between">
                            <span className="text-gray-500">Tržby z objednávek:</span>
                            <span className="font-medium text-blue-700">{ordersTotal.toLocaleString('cs-CZ')} Kč</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Nafta:</span>
                            <span className="font-medium text-red-600">-{(route.fuelCost || 0).toLocaleString('cs-CZ')} Kč</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Výplata řidiče:</span>
                            <span className="font-medium text-red-600">-{(route.driverPay || 0).toLocaleString('cs-CZ')} Kč</span>
                          </div>
                          <div className="flex justify-between pt-2 border-t border-gray-300 font-bold text-base">
                            <span>Zisk:</span>
                            <span className={profit >= 0 ? 'text-green-700' : 'text-red-700'}>
                              {profit.toLocaleString('cs-CZ')} Kč
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
