'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { DriverDayStatus, CalendarRoute } from './DispatcherCalendar';

interface DayDetailModalProps {
  date: Date;
  driversStatus: DriverDayStatus[];
  routes?: CalendarRoute[];
  onClose: () => void;
  onAvailabilityChange?: () => void;
  readOnly?: boolean;
}

const routeStatusLabels: Record<string, string> = {
  PLANNED: 'Naplánováno',
  IN_PROGRESS: 'Probíhá',
  COMPLETED: 'Dokončeno',
};

const routeStatusColors: Record<string, string> = {
  PLANNED: 'bg-blue-100 text-blue-800',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
  COMPLETED: 'bg-green-100 text-green-800',
};

type AvailabilityStatus = 'AVAILABLE' | 'UNAVAILABLE' | 'PARTIAL' | null;

export function DayDetailModal({
  date,
  driversStatus: initialDriversStatus,
  routes = [],
  onClose,
  onAvailabilityChange,
  readOnly,
}: DayDetailModalProps) {
  const [driversStatus, setDriversStatus] = useState(initialDriversStatus);
  const [savingDriverId, setSavingDriverId] = useState<string | null>(null);

  useEffect(() => {
    setDriversStatus(initialDriversStatus);
  }, [initialDriversStatus]);

  const availableDrivers = driversStatus.filter((s) => s.status === 'AVAILABLE');

  const handleToggle = async (driverId: string, currentStatus: AvailabilityStatus) => {
    const newStatus: AvailabilityStatus = currentStatus === 'AVAILABLE' ? null : 'AVAILABLE';
    setSavingDriverId(driverId);
    try {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}T00:00:00.000Z`;

      const response = await fetch('/api/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driverId,
          date: dateStr,
          status: newStatus,
        }),
      });

      if (response.ok) {
        setDriversStatus((prev) =>
          prev.map((ds) =>
            ds.driver.id === driverId
              ? { ...ds, status: newStatus }
              : ds
          )
        );
        onAvailabilityChange?.();
      }
    } catch (error) {
      console.error('Chyba při ukládání dostupnosti:', error);
    } finally {
      setSavingDriverId(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50 sm:p-4">
      <div className="bg-white rounded-t-xl sm:rounded-xl shadow-xl max-w-2xl w-full max-h-[92vh] sm:max-h-[85vh] overflow-hidden flex flex-col">
        <div className="p-4 sm:p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900">
                {format(date, 'EEEE', { locale: cs })}
              </h3>
              <p className="text-gray-600 text-base sm:text-lg">
                {format(date, 'd. MMMM yyyy', { locale: cs })}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-3xl leading-none p-2"
            >
              &times;
            </button>
          </div>

          <div className="flex items-center gap-3 mt-3 text-sm">
            <span className="text-gray-600">
              Dostupných: <strong className="text-green-700">{availableDrivers.length}</strong> / {driversStatus.length}
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
          {/* Sekce tras */}
          {routes.length > 0 && (
            <div>
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span className="w-6 h-6 bg-primary-100 rounded flex items-center justify-center text-primary-600 text-sm font-bold">
                  {routes.length}
                </span>
                Trasy na tento den
              </h4>
              <div className="space-y-2">
                {routes.map((route) => (
                  <div
                    key={route.id}
                    className="p-3 rounded-lg border"
                    style={{
                      backgroundColor: route.driver?.color
                        ? `${route.driver.color}10`
                        : '#F9FAFB',
                      borderColor: route.driver?.color || '#E5E7EB',
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 truncate">
                          {route.name}
                        </div>
                        {route.driver && (
                          <div className="flex items-center gap-2 mt-1">
                            <div
                              className="w-3 h-3 rounded-full flex-shrink-0"
                              style={{ backgroundColor: route.driver.color || '#9CA3AF' }}
                            />
                            <span className="text-sm text-gray-600">
                              {route.driver.name}
                            </span>
                          </div>
                        )}
                        {!route.driver && (
                          <div className="text-sm text-orange-600 mt-1">
                            Nepřiřazen řidič
                          </div>
                        )}
                        {route.vehicle && (
                          <div className="text-sm text-gray-500 mt-1">
                            {route.vehicle.spz} ({route.vehicle.name})
                          </div>
                        )}
                      </div>
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded text-xs font-medium flex-shrink-0',
                          routeStatusColors[route.status] || 'bg-gray-100 text-gray-800'
                        )}
                      >
                        {routeStatusLabels[route.status] || route.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sekce dostupnosti řidičů */}
          {!readOnly && (
            <div>
              <h4 className="font-semibold text-gray-900 mb-2 sm:mb-3">
                Dostupnost řidičů
              </h4>
              <p className="text-sm text-gray-500 mb-3 sm:mb-4">
                Klikněte na řidiče pro přepnutí může / nemůže.
              </p>

              <div className="space-y-2 sm:space-y-3">
                {driversStatus.map(({ driver, status }) => {
                  const isAvailable = status === 'AVAILABLE';
                  return (
                    <button
                      key={driver.id}
                      onClick={() => handleToggle(driver.id, status)}
                      disabled={savingDriverId === driver.id}
                      className={cn(
                        'w-full flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg border-2 transition-all text-left',
                        isAvailable
                          ? 'border-green-400 bg-green-50'
                          : 'border-gray-200 bg-gray-50 hover:border-gray-300',
                        savingDriverId === driver.id && 'opacity-50 pointer-events-none'
                      )}
                    >
                      {/* Barva řidiče */}
                      <div
                        className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold text-sm sm:text-base"
                        style={{ backgroundColor: driver.color || '#9CA3AF' }}
                      >
                        {driver.name.charAt(0).toUpperCase()}
                      </div>

                      {/* Jméno */}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 text-sm sm:text-base truncate">{driver.name}</div>
                      </div>

                      {/* Status indikátor */}
                      <div className={cn(
                        'px-3 py-1 rounded-full text-sm font-medium flex-shrink-0',
                        isAvailable
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-200 text-gray-500'
                      )}>
                        {isAvailable ? 'Může' : 'Nemůže'}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="p-3 sm:p-4 border-t border-gray-200">
          <button onClick={onClose} className="btn-primary w-full">
            Hotovo
          </button>
        </div>
      </div>
    </div>
  );
}
