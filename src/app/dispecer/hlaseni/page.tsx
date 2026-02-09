'use client';

import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface NokReport {
  id: string;
  routeId: string;
  driverId: string;
  actualKm: number;
  carCheck: string;
  carCheckNote: string | null;
  resolved: boolean;
  createdAt: string;
  route: {
    id: string;
    name: string;
    date: string;
    vehicle: { id: string; name: string; spz: string } | null;
  };
  driver: {
    id: string;
    name: string;
    color: string | null;
  };
}

export default function HlaseniPage() {
  const [reports, setReports] = useState<NokReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unresolved' | 'resolved'>('unresolved');

  const fetchReports = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filter === 'resolved') params.set('resolved', 'true');
      else if (filter === 'unresolved') params.set('resolved', 'false');

      const response = await fetch(`/api/daily-reports/nok?${params}`);
      if (response.ok) {
        const data = await response.json();
        setReports(data.reports);
      }
    } catch (error) {
      console.error('Chyba při načítání hlášení:', error);
    } finally {
      setIsLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    setIsLoading(true);
    fetchReports();
  }, [fetchReports]);

  const handleToggleResolved = async (reportId: string, resolved: boolean) => {
    try {
      const response = await fetch('/api/daily-reports/nok', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId, resolved }),
      });

      if (response.ok) {
        setReports((prev) =>
          prev.map((r) => (r.id === reportId ? { ...r, resolved } : r))
        );
      }
    } catch (error) {
      console.error('Chyba při aktualizaci hlášení:', error);
    }
  };

  const unresolvedCount = reports.filter((r) => !r.resolved).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Načítání...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Hlášení vozidel</h1>
        <p className="text-gray-600 mt-1">
          Problémy nahlášené řidiči při kontrole auta (NOK)
        </p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setFilter('unresolved')}
          className={cn(
            'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
            filter === 'unresolved'
              ? 'bg-red-100 text-red-800 border-2 border-red-300'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-2 border-transparent'
          )}
        >
          Nevyřešené
          {filter !== 'unresolved' && unresolvedCount > 0 && (
            <span className="ml-2 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
              {unresolvedCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setFilter('resolved')}
          className={cn(
            'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
            filter === 'resolved'
              ? 'bg-green-100 text-green-800 border-2 border-green-300'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-2 border-transparent'
          )}
        >
          Vyřešené
        </button>
        <button
          onClick={() => setFilter('all')}
          className={cn(
            'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
            filter === 'all'
              ? 'bg-gray-200 text-gray-900 border-2 border-gray-400'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-2 border-transparent'
          )}
        >
          Všechna
        </button>
      </div>

      {reports.length === 0 ? (
        <div className="card py-12 text-center">
          <div className="text-4xl mb-3">
            {filter === 'unresolved' ? '🎉' : '📋'}
          </div>
          <p className="text-gray-500">
            {filter === 'unresolved'
              ? 'Žádná nevyřešená hlášení'
              : filter === 'resolved'
              ? 'Žádná vyřešená hlášení'
              : 'Žádná hlášení'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <div
              key={report.id}
              className={cn(
                'card p-4 sm:p-6 transition-all',
                !report.resolved && 'border-l-4 border-l-red-500 bg-red-50/30',
                report.resolved && 'border-l-4 border-l-green-500 opacity-75'
              )}
            >
              <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
                {/* Driver avatar */}
                <div
                  className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold"
                  style={{ backgroundColor: report.driver.color || '#9CA3AF' }}
                >
                  {report.driver.name.charAt(0).toUpperCase()}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                    <span className="font-semibold text-gray-900">
                      {report.driver.name}
                    </span>
                    <span className="text-sm text-gray-500">
                      {format(new Date(report.route.date), 'd. MMMM yyyy', { locale: cs })}
                    </span>
                  </div>

                  <div className="mt-1 text-sm text-gray-600">
                    Trasa: <span className="font-medium">{report.route.name}</span>
                  </div>

                  {report.route.vehicle && (
                    <div className="text-sm text-gray-500">
                      Vozidlo: {report.route.vehicle.name} ({report.route.vehicle.spz})
                    </div>
                  )}

                  {report.carCheckNote && (
                    <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="text-xs font-medium text-red-800 mb-1">Popis problému:</div>
                      <p className="text-sm text-red-700 whitespace-pre-wrap">
                        {report.carCheckNote}
                      </p>
                    </div>
                  )}

                  {!report.carCheckNote && (
                    <div className="mt-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <p className="text-sm text-orange-700">
                        Řidič nahlásil problém bez popisu.
                      </p>
                    </div>
                  )}

                  <div className="text-xs text-gray-400 mt-2">
                    Nahlášeno: {format(new Date(report.createdAt), 'd.M.yyyy HH:mm', { locale: cs })}
                  </div>
                </div>

                {/* Action button */}
                <div className="flex-shrink-0 self-start">
                  {!report.resolved ? (
                    <button
                      onClick={() => handleToggleResolved(report.id, true)}
                      className="px-4 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-medium hover:bg-green-200 transition-colors whitespace-nowrap"
                    >
                      Vyřešit
                    </button>
                  ) : (
                    <button
                      onClick={() => handleToggleResolved(report.id, false)}
                      className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors whitespace-nowrap"
                    >
                      Znovu otevřít
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
