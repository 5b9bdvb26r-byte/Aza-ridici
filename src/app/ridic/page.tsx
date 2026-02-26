'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  isToday,
  isPast,
  startOfDay,
} from 'date-fns';
import { cs } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface AvailabilityData {
  id: string;
  date: string;
  status: 'AVAILABLE' | 'UNAVAILABLE' | 'PARTIAL';
  note?: string;
}

export default function DriverAvailabilityPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [availability, setAvailability] = useState<AvailabilityData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [savingDate, setSavingDate] = useState<string | null>(null);
  const [pendingRoutes, setPendingRoutes] = useState(0);

  useEffect(() => {
    fetchAvailability();
    fetchPendingRoutes();
  }, []);

  const fetchPendingRoutes = async () => {
    try {
      const response = await fetch('/api/routes/pending-count');
      if (response.ok) {
        const data = await response.json();
        setPendingRoutes(data.count);
      }
    } catch {
      // silently fail
    }
  };

  const fetchAvailability = async () => {
    try {
      const response = await fetch('/api/availability');
      if (response.ok) {
        const data = await response.json();
        setAvailability(data);
      }
    } catch (error) {
      console.error('Chyba při načítání dostupnosti:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Klik na den = toggle dostupnost
  const handleDayClick = async (day: Date) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    setSavingDate(dateStr);

    const existing = availability.find((a) => isSameDay(new Date(a.date), day));

    try {
      if (existing) {
        // Už je dostupný → smazat (zrušit dostupnost)
        await fetch('/api/availability', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date: dateStr, status: null }),
        });
      } else {
        // Není nastaveno → nastavit jako dostupný
        await fetch('/api/availability', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date: dateStr, status: 'AVAILABLE' }),
        });
      }
      await fetchAvailability();
    } catch (error) {
      console.error('Chyba při ukládání dostupnosti:', error);
    } finally {
      setSavingDate(null);
    }
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days = useMemo(
    () => eachDayOfInterval({ start: calendarStart, end: calendarEnd }),
    [calendarStart.getTime(), calendarEnd.getTime()]
  );

  const getAvailabilityForDay = (date: Date): AvailabilityData | null => {
    return availability.find((a) => isSameDay(new Date(a.date), date)) || null;
  };

  const weekDays = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Načítání...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Moje dostupnost</h1>
        <p className="text-gray-600 mt-1">Klikněte na den = dostupný, klikněte znovu = zrušit</p>
      </div>

      {/* Upozornění na nevyplněné reporty */}
      {pendingRoutes > 0 && (
        <Link href="/ridic/trasy" className="block mb-6">
          <div className="p-4 bg-orange-50 border-2 border-orange-300 rounded-lg flex items-center gap-3 hover:bg-orange-100 transition-colors">
            <div className="flex-shrink-0 w-10 h-10 bg-orange-500 text-white rounded-full flex items-center justify-center font-bold text-lg">
              {pendingRoutes}
            </div>
            <div>
              <div className="font-semibold text-orange-800">
                {pendingRoutes === 1 ? 'Máte 1 nevyplněný report' : `Máte ${pendingRoutes} nevyplněné reporty`}
              </div>
              <div className="text-sm text-orange-600">
                Klikněte pro vyplnění v Moje trasy
              </div>
            </div>
            <div className="ml-auto text-orange-400 text-xl">&rarr;</div>
          </div>
        </Link>
      )}

      {/* Kalendář */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="btn-secondary"
          >
            &larr;
          </button>
          <h2 className="text-xl font-semibold text-gray-900 capitalize">
            {format(currentMonth, 'LLLL yyyy', { locale: cs })}
          </h2>
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="btn-secondary"
          >
            &rarr;
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDays.map((day) => (
            <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {days.map((day) => {
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const dayAvailability = getAvailabilityForDay(day);
            const isAvailable = dayAvailability?.status === 'AVAILABLE';
            const dateStr = format(day, 'yyyy-MM-dd');
            const isSavingThis = savingDate === dateStr;
            const dayIsPast = isPast(startOfDay(day)) && !isToday(day);

            return (
              <button
                key={day.toISOString()}
                onClick={() => isCurrentMonth && !dayIsPast && handleDayClick(day)}
                disabled={!isCurrentMonth || dayIsPast || isSavingThis}
                className={cn(
                  'min-h-[70px] sm:min-h-[80px] p-2 rounded-lg text-sm transition-all relative flex flex-col items-center justify-center',
                  !isCurrentMonth && 'opacity-30 cursor-not-allowed bg-gray-50',
                  dayIsPast && isCurrentMonth && 'opacity-40 cursor-not-allowed',
                  isCurrentMonth && !dayIsPast && !isAvailable && 'bg-white hover:bg-green-50 border-2 border-gray-200 hover:border-green-300 cursor-pointer',
                  isCurrentMonth && !dayIsPast && isAvailable && 'bg-green-100 border-2 border-green-400 hover:bg-red-50 hover:border-red-300 cursor-pointer',
                  isToday(day) && 'ring-2 ring-primary-500 ring-offset-1',
                  isSavingThis && 'opacity-50 pointer-events-none'
                )}
              >
                <span
                  className={cn(
                    'font-bold text-sm w-7 h-7 flex items-center justify-center rounded-full',
                    isToday(day) ? 'bg-primary-500 text-white' : 'text-gray-900'
                  )}
                >
                  {format(day, 'd')}
                </span>
                {isCurrentMonth && isAvailable && (
                  <div className="flex flex-col items-center mt-1">
                    <span className="text-lg leading-none">✅</span>
                  </div>
                )}
                {isSavingThis && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/50 rounded-lg">
                    <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Legenda */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-center flex-wrap gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white border-2 border-gray-200 rounded-lg" />
              <span className="text-gray-600">Nekliknuto</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-green-100 border-2 border-green-400 rounded-lg flex items-center justify-center text-sm">✅</div>
              <span className="text-gray-600">Dostupný</span>
            </div>
          </div>
          <p className="text-center text-xs text-gray-400 mt-3">Klikněte na den pro nastavení / zrušení dostupnosti</p>
        </div>
      </div>
    </div>
  );
}
