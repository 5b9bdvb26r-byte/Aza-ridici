'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface Report {
  id: string;
  routeId: string;
  actualKm: number;
  carCheck: string;
  carCheckNote: string | null;
  createdAt: string;
  route: {
    id: string;
    name: string;
    date: string;
    plannedKm: number | null;
    vehicle: { id: string; name: string; spz: string } | null;
  };
}

export default function DriverHlaseniPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchReports(), fetchPendingCount()]).then(() => setIsLoading(false));
  }, []);

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

  const fetchPendingCount = async () => {
    try {
      const response = await fetch('/api/routes/pending-count');
      if (response.ok) {
        const data = await response.json();
        setPendingCount(data.count);
      }
    } catch {
      // silently fail
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Načítání...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Moje hlášení</h1>
        <p className="text-gray-600 mt-1">Přehled vašich odeslaných denních reportů</p>
      </div>

      {/* Upozornění na nevyplněné reporty */}
      {pendingCount > 0 && (
        <Link href="/ridic/trasy" className="block mb-6">
          <div className="p-4 bg-orange-50 border-2 border-orange-300 rounded-lg flex items-center gap-3 hover:bg-orange-100 transition-colors">
            <div className="flex-shrink-0 w-12 h-12 bg-orange-500 text-white rounded-full flex items-center justify-center font-bold text-xl">
              {pendingCount}
            </div>
            <div>
              <div className="font-semibold text-orange-800">
                {pendingCount === 1
                  ? 'Máte 1 nevyplněný report'
                  : pendingCount < 5
                  ? `Máte ${pendingCount} nevyplněné reporty`
                  : `Máte ${pendingCount} nevyplněných reportů`}
              </div>
              <div className="text-sm text-orange-600">
                Klikněte pro vyplnění v Moje trasy
              </div>
            </div>
            <div className="ml-auto text-orange-400">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </Link>
      )}

      {/* Seznam odeslaných reportů */}
      {reports.length === 0 ? (
        <div className="card py-12 text-center text-gray-500">
          Zatím žádné odeslané reporty
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <div
              key={report.id}
              className={cn(
                'card p-4 transition-all',
                report.carCheck === 'NOK'
                  ? 'border-l-4 border-l-red-500 bg-red-50/30'
                  : 'border-l-4 border-l-green-500 bg-green-50/20'
              )}
            >
              <div className="flex items-start gap-3">
                {/* Status icon */}
                <div className={cn(
                  'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center',
                  report.carCheck === 'OK' ? 'bg-green-100' : 'bg-red-100'
                )}>
                  {report.carCheck === 'OK' ? (
                    <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                    <span className="font-semibold text-gray-900 truncate">
                      {report.route.name}
                    </span>
                    <span className={cn(
                      'px-2 py-0.5 rounded-full text-xs font-bold w-fit',
                      report.carCheck === 'OK'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    )}>
                      {report.carCheck}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500 mt-1">
                    <span>{format(new Date(report.route.date), 'd. MMMM yyyy', { locale: cs })}</span>
                    {report.route.vehicle && (
                      <span>{report.route.vehicle.name} ({report.route.vehicle.spz})</span>
                    )}
                    <span>
                      {report.actualKm} km
                      {report.route.plannedKm && report.actualKm !== report.route.plannedKm && (
                        <span className="text-gray-400 ml-1">(plán: {report.route.plannedKm} km)</span>
                      )}
                    </span>
                  </div>

                  {report.carCheck === 'NOK' && report.carCheckNote && (
                    <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="text-xs font-medium text-red-800 mb-1">Nahlášený problém:</div>
                      <p className="text-sm text-red-700 whitespace-pre-wrap">
                        {report.carCheckNote}
                      </p>
                    </div>
                  )}

                  <div className="text-xs text-gray-400 mt-2">
                    Odesláno: {format(new Date(report.createdAt), 'd.M.yyyy HH:mm', { locale: cs })}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
