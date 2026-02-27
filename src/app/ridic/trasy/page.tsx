'use client';

import { useState, useEffect } from 'react';
import { format, isToday, isBefore, startOfDay } from 'date-fns';
import { cs } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Vehicle {
  id: string;
  name: string;
  spz: string;
  currentKm: number;
}

interface Order {
  id: string;
  orderNumber: string;
  price: number;
  deliveryTime: string | null;
  note: string | null;
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
  vehicle: Vehicle | null;
  orders?: Order[];
  dailyReport?: DailyReport | null;
}

interface DailyReport {
  id: string;
  routeId: string;
  actualKm: number;
  endKm: number | null;
  fuelCost: number;
  carCheck: string;
  carCheckNote: string | null;
}

export default function DriverRoutesPage() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());

  // Denní formulář
  const [activeReport, setActiveReport] = useState<string | null>(null);
  const [reportForm, setReportForm] = useState({
    endKm: '',
    fuelCost: '',
    carCheck: 'OK',
    carCheckNote: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetchRoutes(), fetchReports()]).then(() => setIsLoading(false));
  }, []);

  const fetchRoutes = async () => {
    try {
      const response = await fetch('/api/routes');
      if (response.ok) {
        const data = await response.json();
        setRoutes(data);
      }
    } catch (error) {
      console.error('Chyba při načítání tras:', error);
    }
  };

  const fetchReports = async () => {
    try {
      const response = await fetch('/api/daily-reports');
      if (response.ok) {
        const data = await response.json();
        setReports(data);
      }
    } catch (error) {
      console.error('Chyba při načítání reportů:', error);
    }
  };

  const hasReport = (routeId: string) => {
    return reports.some((r) => r.routeId === routeId);
  };

  const getReport = (routeId: string) => {
    return reports.find((r) => r.routeId === routeId);
  };

  const toggleOrders = (routeId: string) => {
    setExpandedOrders((prev) => {
      const next = new Set(prev);
      if (next.has(routeId)) {
        next.delete(routeId);
      } else {
        next.add(routeId);
      }
      return next;
    });
  };

  const handleOpenReport = (route: Route) => {
    setActiveReport(route.id);
    setReportForm({
      endKm: '',
      fuelCost: '',
      carCheck: 'OK',
      carCheckNote: '',
    });
    setSaveError(null);
    setSaveSuccess(null);
  };

  const handleSubmitReport = async () => {
    if (!activeReport) return;
    setIsSaving(true);
    setSaveError(null);

    try {
      const response = await fetch('/api/daily-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          routeId: activeReport,
          endKm: reportForm.endKm,
          fuelCost: reportForm.fuelCost,
          carCheck: reportForm.carCheck,
          carCheckNote: reportForm.carCheck === 'NOK' ? reportForm.carCheckNote : null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Chyba při odesílání reportu');
      }

      setSaveSuccess('Report úspěšně odeslán');
      setActiveReport(null);
      await Promise.all([fetchRoutes(), fetchReports()]);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Neznámá chyba');
    } finally {
      setIsSaving(false);
    }
  };

  // Rozdělit trasy
  const today = startOfDay(new Date());
  const needsReport = routes.filter((r) => {
    const routeDate = startOfDay(new Date(r.date));
    const isPastOrToday = isBefore(routeDate, today) || isToday(new Date(r.date));
    // Trasa potřebuje report pokud: datum je dnes nebo v minulosti A nemá vyplněný report
    // (bez ohledu na status - i COMPLETED trasy bez reportu potřebují vyplnit)
    return isPastOrToday && !hasReport(r.id);
  });

  const upcomingRoutes = routes.filter((r) => {
    const routeDate = startOfDay(new Date(r.date));
    return !isBefore(routeDate, today) && !isToday(new Date(r.date));
  });

  const completedRoutes = routes.filter((r) => hasReport(r.id));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Načítání...</div>
      </div>
    );
  }

  // Komponenta pro objednávky
  const OrdersSection = ({ route }: { route: Route }) => {
    if (!route.orders || route.orders.length === 0) return null;
    const ordersTotal = route.orders.reduce((sum, o) => sum + (o.price || 0), 0);
    const isExpanded = expandedOrders.has(route.id);

    return (
      <div className="mt-2">
        <button
          onClick={() => toggleOrders(route.id)}
          className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 font-medium"
        >
          <svg
            className={cn('w-4 h-4 transition-transform', isExpanded && 'rotate-90')}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          {route.orders.length} objednávek ({ordersTotal.toLocaleString('cs-CZ')} Kč)
        </button>

        {isExpanded && (
          <div className="mt-2 space-y-1.5">
            {route.orders.map((order) => (
              <div key={order.id} className="text-sm bg-gray-50 rounded-lg p-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-medium text-gray-800">{order.orderNumber}</span>
                  <span className="font-medium text-gray-900">{order.price.toLocaleString('cs-CZ')} Kč</span>
                </div>
                {(order.deliveryTime || order.note) && (
                  <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                    {order.deliveryTime && <span>Doručení: {order.deliveryTime}</span>}
                    {order.note && <span>{order.note}</span>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Moje trasy</h1>
        <p className="text-gray-600 mt-1">Přehled vašich tras a denní reporty</p>
      </div>

      {saveSuccess && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
          {saveSuccess}
        </div>
      )}

      {/* Trasy vyžadující report */}
      {needsReport.length > 0 && (
        <div className="card mb-6 border-2 border-orange-200 bg-orange-50/30">
          <h2 className="text-lg font-semibold text-orange-800 mb-4">
            K vyplnění ({needsReport.length})
          </h2>
          <div className="space-y-3">
            {needsReport.map((route) => (
              <div key={route.id}>
                <div className="p-3 sm:p-4 bg-white rounded-lg border border-orange-200">
                  <div className="flex items-start gap-3 sm:gap-4">
                    <div className="text-center min-w-[45px] sm:min-w-[60px]">
                      <div className="text-xl sm:text-2xl font-bold text-gray-900">
                        {format(new Date(route.date), 'd')}
                      </div>
                      <div className="text-xs text-gray-500 uppercase">
                        {format(new Date(route.date), 'MMM', { locale: cs })}
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate">{route.name}</div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500 mt-1">
                        {route.vehicle && <span>{route.vehicle.name} ({route.vehicle.spz})</span>}
                        {route.plannedKm && <span>Plan: {route.plannedKm} km</span>}
                      </div>
                      {route.mapUrl && (
                        <a
                          href={route.mapUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary-600 hover:underline"
                        >
                          Mapa
                        </a>
                      )}
                      {route.note && (
                        <p className="text-sm text-gray-500 mt-1">{route.note}</p>
                      )}
                      <OrdersSection route={route} />
                    </div>
                  </div>

                  <div className="mt-2 pt-2 border-t border-orange-100 sm:border-t-0 sm:pt-0 sm:mt-0 flex justify-end">
                    <button
                      onClick={() => handleOpenReport(route)}
                      className="btn-primary text-sm w-full sm:w-auto"
                    >
                      Vyplnit report
                    </button>
                  </div>
                </div>

                {/* Denní formulář */}
                {activeReport === route.id && (
                  <div className="mt-2 p-4 bg-white rounded-lg border-2 border-primary-200">
                    <h3 className="font-semibold text-gray-900 mb-4">
                      Denní report - {route.name}
                    </h3>

                    {saveError && (
                      <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                        {saveError}
                      </div>
                    )}

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Konečný stav tachometru (km)
                        </label>
                        <input
                          type="number"
                          value={reportForm.endKm}
                          onChange={(e) => setReportForm({ ...reportForm, endKm: e.target.value })}
                          className="input w-full"
                          placeholder="Stav tachometru po jízdě"
                          min="0"
                        />
                        {route.vehicle && (
                          <div className="mt-1 space-y-0.5">
                            <p className="text-xs text-gray-500">
                              Předchozí stav: {route.vehicle.currentKm > 0 ? `${route.vehicle.currentKm.toLocaleString('cs-CZ')} km` : 'nenastaveno'}
                            </p>
                            {reportForm.endKm && route.vehicle.currentKm > 0 && (
                              <p className="text-xs font-medium text-primary-600">
                                Ujeté km: {Math.max(0, parseInt(reportForm.endKm) - route.vehicle.currentKm).toLocaleString('cs-CZ')} km
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Nafta (Kč)
                        </label>
                        <input
                          type="number"
                          value={reportForm.fuelCost}
                          onChange={(e) => setReportForm({ ...reportForm, fuelCost: e.target.value })}
                          className="input w-full"
                          placeholder="Kolik jste natankovali v Kč"
                          min="0"
                          step="1"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Kontrola auta
                        </label>
                        <div className="flex gap-3">
                          <button
                            type="button"
                            onClick={() => setReportForm({ ...reportForm, carCheck: 'OK' })}
                            className={cn(
                              'flex-1 p-3 rounded-lg border-2 text-center font-medium transition-all',
                              reportForm.carCheck === 'OK'
                                ? 'border-green-500 bg-green-50 text-green-700'
                                : 'border-gray-200 hover:border-gray-300 text-gray-600'
                            )}
                          >
                            OK
                          </button>
                          <button
                            type="button"
                            onClick={() => setReportForm({ ...reportForm, carCheck: 'NOK' })}
                            className={cn(
                              'flex-1 p-3 rounded-lg border-2 text-center font-medium transition-all',
                              reportForm.carCheck === 'NOK'
                                ? 'border-red-500 bg-red-50 text-red-700'
                                : 'border-gray-200 hover:border-gray-300 text-gray-600'
                            )}
                          >
                            NOK
                          </button>
                        </div>
                      </div>

                      {reportForm.carCheck === 'NOK' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Popis problému
                          </label>
                          <textarea
                            value={reportForm.carCheckNote}
                            onChange={(e) => setReportForm({ ...reportForm, carCheckNote: e.target.value })}
                            className="input w-full min-h-[80px]"
                            placeholder="Popište zjištěný problém..."
                          />
                        </div>
                      )}

                      <div className="flex gap-3 pt-2">
                        <button
                          onClick={() => setActiveReport(null)}
                          className="btn-secondary flex-1"
                        >
                          Zrušit
                        </button>
                        <button
                          onClick={handleSubmitReport}
                          disabled={isSaving || !reportForm.endKm}
                          className="btn-primary flex-1"
                        >
                          {isSaving ? 'Odesílám...' : 'Odeslat report'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Nadcházející trasy */}
      {upcomingRoutes.length > 0 && (
        <div className="card mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Nadcházející ({upcomingRoutes.length})
          </h2>
          <div className="space-y-3">
            {upcomingRoutes.map((route) => (
              <div key={route.id} className="p-3 sm:p-4 bg-gray-50 rounded-lg">
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="text-center min-w-[45px] sm:min-w-[60px]">
                    <div className="text-xl sm:text-2xl font-bold text-gray-900">
                      {format(new Date(route.date), 'd')}
                    </div>
                    <div className="text-xs text-gray-500 uppercase">
                      {format(new Date(route.date), 'MMM', { locale: cs })}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">{route.name}</div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500 mt-1">
                      {route.vehicle && <span>{route.vehicle.name} ({route.vehicle.spz})</span>}
                      {route.plannedKm && <span>Plan: {route.plannedKm} km</span>}
                    </div>
                    {route.mapUrl && (
                      <a
                        href={route.mapUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary-600 hover:underline"
                      >
                        Mapa
                      </a>
                    )}
                    {route.note && (
                      <p className="text-sm text-gray-500 mt-1">{route.note}</p>
                    )}
                    <OrdersSection route={route} />
                    <span className="inline-block mt-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-lg text-xs sm:text-sm font-medium">
                      {format(new Date(route.date), 'EEEE', { locale: cs })}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dokončené */}
      {completedRoutes.length > 0 && (
        <div className="card bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">
            Dokončené ({completedRoutes.length})
          </h2>
          <div className="space-y-3">
            {completedRoutes.map((route) => {
              const report = getReport(route.id);
              return (
                <div key={route.id} className="p-3 sm:p-4 bg-white rounded-lg border border-gray-200">
                  <div className="flex items-start gap-3 sm:gap-4">
                    <div className="text-center min-w-[45px] sm:min-w-[60px]">
                      <div className="text-xl sm:text-2xl font-bold text-gray-400">
                        {format(new Date(route.date), 'd')}
                      </div>
                      <div className="text-xs text-gray-400 uppercase">
                        {format(new Date(route.date), 'MMM', { locale: cs })}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-medium text-gray-600 truncate">{route.name}</div>
                        <span className="flex-shrink-0 px-2 py-0.5 bg-green-100 text-green-700 rounded-lg text-xs sm:text-sm font-medium">
                          Hotovo
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-400 mt-1">
                        {route.vehicle && <span>{route.vehicle.name}</span>}
                        {report?.endKm
                          ? <span>Tach.: {report.endKm.toLocaleString('cs-CZ')} km</span>
                          : <span>{route.actualKm || route.plannedKm || 0} km</span>
                        }
                        {report && (
                          <span className={cn(
                            'px-2 py-0.5 rounded-full text-xs font-bold',
                            report.carCheck === 'OK'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          )}>
                            Auto: {report.carCheck}
                          </span>
                        )}
                      </div>
                      {report && report.fuelCost > 0 && (
                        <span className="text-sm text-gray-500">
                          Nafta: {report.fuelCost.toLocaleString('cs-CZ')} Kč
                        </span>
                      )}
                      {report?.carCheckNote && (
                        <p className="text-red-500 text-xs mt-1">{report.carCheckNote}</p>
                      )}
                      <OrdersSection route={route} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {routes.length === 0 && (
        <div className="card py-12 text-center text-gray-500">
          Žádné přiřazené trasy
        </div>
      )}
    </div>
  );
}
