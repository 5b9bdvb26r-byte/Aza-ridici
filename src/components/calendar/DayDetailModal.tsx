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
}

const statusColors: Record<string, string> = {
  AVAILABLE: 'bg-green-500',
  UNAVAILABLE: 'bg-red-500',
  PARTIAL: 'bg-orange-500',
};

const statusLabels: Record<string, string> = {
  AVAILABLE: 'Dostupný',
  UNAVAILABLE: 'Nedostupný',
  PARTIAL: 'Částečně',
};

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
}: DayDetailModalProps) {
  const [driversStatus, setDriversStatus] = useState(initialDriversStatus);
  const [savingDriverId, setSavingDriverId] = useState<string | null>(null);
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');

  // Sync with parent when props change (e.g. after refetch)
  useEffect(() => {
    setDriversStatus(initialDriversStatus);
  }, [initialDriversStatus]);

  const available = driversStatus.filter((s) => s.status === 'AVAILABLE');
  const partial = driversStatus.filter((s) => s.status === 'PARTIAL');
  const unavailable = driversStatus.filter((s) => s.status === 'UNAVAILABLE');
  const notSet = driversStatus.filter((s) => s.status === null);

  const handleStatusChange = async (driverId: string, newStatus: AvailabilityStatus, note?: string) => {
    setSavingDriverId(driverId);
    try {
      // Send date as YYYY-MM-DD to avoid timezone issues
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
          note: note || null,
        }),
      });

      if (response.ok) {
        // Aktualizovat lokální stav
        setDriversStatus((prev) =>
          prev.map((ds) =>
            ds.driver.id === driverId
              ? { ...ds, status: newStatus, note: note || undefined }
              : ds
          )
        );
        onAvailabilityChange?.();
      }
    } catch (error) {
      console.error('Chyba při ukládání dostupnosti:', error);
    } finally {
      setSavingDriverId(null);
      setEditingNote(null);
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

          <div className="flex items-center gap-3 sm:gap-6 mt-3 sm:mt-4 text-xs sm:text-sm">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="w-3 h-3 sm:w-4 sm:h-4 bg-green-500 rounded-full" />
              <span className="text-green-700 font-medium">{available.length} <span className="hidden sm:inline">dostupných</span></span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="w-3 h-3 sm:w-4 sm:h-4 bg-orange-500 rounded-full" />
              <span className="text-orange-700 font-medium">{partial.length} <span className="hidden sm:inline">částečně</span></span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="w-3 h-3 sm:w-4 sm:h-4 bg-red-500 rounded-full" />
              <span className="text-red-700 font-medium">{unavailable.length} <span className="hidden sm:inline">nedostupných</span></span>
            </div>
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

          {/* Sekce nastavení dostupnosti */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-2 sm:mb-3">
              Nastavit dostupnost řidičů
            </h4>
            <p className="text-sm text-gray-500 mb-3 sm:mb-4">
              Klikněte na tlačítko pro změnu stavu.
            </p>

            <div className="space-y-2 sm:space-y-3">
              {driversStatus.map(({ driver, status, note }) => (
                <div
                  key={driver.id}
                  className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg bg-gray-50 border border-gray-200"
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
                    {note && (
                      <div className="text-xs sm:text-sm text-gray-500 truncate">
                        {note}
                      </div>
                    )}
                  </div>

                  {/* Tlačítka stavů */}
                  <div className="flex gap-0.5 sm:gap-1 flex-shrink-0">
                    <button
                      onClick={() => handleStatusChange(driver.id, 'AVAILABLE', note || undefined)}
                      disabled={savingDriverId === driver.id}
                      className={cn(
                        'w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center text-base sm:text-lg transition-all',
                        status === 'AVAILABLE'
                          ? 'bg-green-500 text-white shadow-md'
                          : 'bg-green-100 text-green-600 hover:bg-green-200'
                      )}
                      title="Dostupný"
                    >
                      ✓
                    </button>
                    <button
                      onClick={() => handleStatusChange(driver.id, 'PARTIAL', note || undefined)}
                      disabled={savingDriverId === driver.id}
                      className={cn(
                        'w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center text-base sm:text-lg transition-all',
                        status === 'PARTIAL'
                          ? 'bg-orange-500 text-white shadow-md'
                          : 'bg-orange-100 text-orange-600 hover:bg-orange-200'
                      )}
                      title="Částečně dostupný"
                    >
                      ~
                    </button>
                    <button
                      onClick={() => handleStatusChange(driver.id, 'UNAVAILABLE', note || undefined)}
                      disabled={savingDriverId === driver.id}
                      className={cn(
                        'w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center text-base sm:text-lg transition-all',
                        status === 'UNAVAILABLE'
                          ? 'bg-red-500 text-white shadow-md'
                          : 'bg-red-100 text-red-600 hover:bg-red-200'
                      )}
                      title="Nedostupný"
                    >
                      ✕
                    </button>
                    <button
                      onClick={() => handleStatusChange(driver.id, null)}
                      disabled={savingDriverId === driver.id}
                      className={cn(
                        'w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center text-base sm:text-lg transition-all',
                        status === null
                          ? 'bg-gray-400 text-white shadow-md'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      )}
                      title="Vymazat"
                    >
                      ○
                    </button>
                    <button
                      onClick={() => {
                        setEditingNote(driver.id);
                        setNoteText(note || '');
                      }}
                      className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center text-base sm:text-lg bg-blue-100 text-blue-600 hover:bg-blue-200 transition-all"
                      title="Přidat poznámku"
                    >
                      📝
                    </button>
                  </div>

                  {savingDriverId === driver.id && (
                    <div className="text-sm text-gray-500">...</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-3 sm:p-4 border-t border-gray-200">
          <button onClick={onClose} className="btn-primary w-full">
            Hotovo
          </button>
        </div>

        {/* Modal pro poznámku */}
        {editingNote && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-[60] sm:p-4">
            <div className="bg-white rounded-t-xl sm:rounded-xl shadow-xl max-w-md w-full p-4 sm:p-6">
              <h4 className="font-semibold text-gray-900 mb-4">
                Poznámka k dostupnosti
              </h4>
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                className="input min-h-[100px] w-full"
                placeholder="např. Pouze dopoledne, Od 14:00..."
                autoFocus
              />
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => setEditingNote(null)}
                  className="btn-secondary flex-1"
                >
                  Zrušit
                </button>
                <button
                  onClick={() => {
                    const driverStatus = driversStatus.find(
                      (ds) => ds.driver.id === editingNote
                    );
                    handleStatusChange(
                      editingNote,
                      driverStatus?.status || 'PARTIAL',
                      noteText
                    );
                  }}
                  className="btn-primary flex-1"
                >
                  Uložit
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
