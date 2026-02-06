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
} from 'date-fns';
import { cs } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface AvailabilityData {
  id: string;
  date: string;
  status: 'AVAILABLE' | 'UNAVAILABLE' | 'PARTIAL';
  note?: string;
}

const statusOptions = [
  { value: 'AVAILABLE', label: 'Dostupný', color: 'bg-green-500', bgColor: 'bg-green-100', textColor: 'text-green-700' },
  { value: 'PARTIAL', label: 'Částečně', color: 'bg-orange-500', bgColor: 'bg-orange-100', textColor: 'text-orange-700' },
  { value: 'UNAVAILABLE', label: 'Nedostupný', color: 'bg-red-500', bgColor: 'bg-red-100', textColor: 'text-red-700' },
];

export default function DriverAvailabilityPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [availability, setAvailability] = useState<AvailabilityData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>('AVAILABLE');
  const [selectedNote, setSelectedNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchAvailability();
  }, []);

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

  const handleDayClick = (day: Date) => {
    setSelectedDate(day);
    const existing = availability.find((a) => isSameDay(new Date(a.date), day));
    if (existing) {
      setSelectedStatus(existing.status);
      setSelectedNote(existing.note || '');
    } else {
      setSelectedStatus('AVAILABLE');
      setSelectedNote('');
    }
  };

  const handleSave = async () => {
    if (!selectedDate) return;
    setIsSaving(true);

    try {
      const response = await fetch('/api/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: format(selectedDate, 'yyyy-MM-dd'),
          status: selectedStatus,
          note: selectedNote || null,
        }),
      });

      if (response.ok) {
        await fetchAvailability();
        setSelectedDate(null);
      }
    } catch (error) {
      console.error('Chyba při ukládání dostupnosti:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClear = async () => {
    if (!selectedDate) return;
    setIsSaving(true);

    try {
      const response = await fetch('/api/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: format(selectedDate, 'yyyy-MM-dd'),
          status: null,
        }),
      });

      if (response.ok) {
        await fetchAvailability();
        setSelectedDate(null);
      }
    } catch (error) {
      console.error('Chyba při mazání dostupnosti:', error);
    } finally {
      setIsSaving(false);
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

  const statusColors: Record<string, string> = {
    AVAILABLE: 'bg-green-500',
    UNAVAILABLE: 'bg-red-500',
    PARTIAL: 'bg-orange-500',
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
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Moje dostupnost</h1>
        <p className="text-gray-600 mt-1">Nastavte svou dostupnost pro rozvoz</p>
      </div>

      {/* Kalendář */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="btn-secondary"
          >
            &larr; Předchozí
          </button>
          <h2 className="text-xl font-semibold text-gray-900 capitalize">
            {format(currentMonth, 'LLLL yyyy', { locale: cs })}
          </h2>
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="btn-secondary"
          >
            Další &rarr;
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
            const isSelected = selectedDate && isSameDay(day, selectedDate);

            return (
              <button
                key={day.toISOString()}
                onClick={() => isCurrentMonth && handleDayClick(day)}
                disabled={!isCurrentMonth}
                className={cn(
                  'min-h-[80px] p-2 rounded-lg text-sm transition-colors relative flex flex-col items-center',
                  !isCurrentMonth && 'opacity-30 cursor-not-allowed bg-gray-50',
                  isCurrentMonth && 'bg-white hover:bg-gray-50 border border-gray-200 shadow-sm',
                  isToday(day) && 'ring-2 ring-primary-500 ring-offset-1 border-primary-300',
                  isSelected && 'ring-2 ring-blue-500 ring-offset-1'
                )}
              >
                <span
                  className={cn(
                    'font-bold text-sm w-7 h-7 flex items-center justify-center rounded-full mb-1',
                    isToday(day) ? 'bg-primary-500 text-white' : 'text-gray-900'
                  )}
                >
                  {format(day, 'd')}
                </span>
                {isCurrentMonth && dayAvailability && (
                  <div className="flex flex-col items-center gap-1">
                    <div
                      className={cn(
                        'w-4 h-4 rounded-full',
                        statusColors[dayAvailability.status]
                      )}
                    />
                    <span className="text-[10px] text-gray-500 text-center leading-tight">
                      {dayAvailability.status === 'AVAILABLE' && 'Dostupný'}
                      {dayAvailability.status === 'PARTIAL' && 'Částečně'}
                      {dayAvailability.status === 'UNAVAILABLE' && 'Nedostupný'}
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Legenda */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-center flex-wrap gap-4 text-sm">
            <div className="flex items-center space-x-2">
              <span className="w-4 h-4 bg-green-500 rounded-full" />
              <span>Dostupný</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-4 h-4 bg-orange-500 rounded-full" />
              <span>Částečně</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-4 h-4 bg-red-500 rounded-full" />
              <span>Nedostupný</span>
            </div>
          </div>
        </div>
      </div>

      {/* Modal - nastavení dostupnosti */}
      {selectedDate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Nastavit dostupnost
            </h3>
            <p className="text-gray-600 mb-4">
              {format(selectedDate, 'EEEE d. MMMM yyyy', { locale: cs })}
            </p>

            <div className="space-y-3 mb-4">
              {statusOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSelectedStatus(option.value)}
                  className={cn(
                    'w-full p-3 rounded-lg border-2 text-left transition-all flex items-center gap-3',
                    selectedStatus === option.value
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  )}
                >
                  <div className={cn('w-5 h-5 rounded-full', option.color)} />
                  <span className="font-medium">{option.label}</span>
                </button>
              ))}
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Poznámka (volitelně)
              </label>
              <input
                type="text"
                value={selectedNote}
                onChange={(e) => setSelectedNote(e.target.value)}
                className="input w-full"
                placeholder="např. Odpoledne volný, Do 14:00..."
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setSelectedDate(null)}
                className="btn-secondary flex-1"
              >
                Zrušit
              </button>
              {getAvailabilityForDay(selectedDate) && (
                <button
                  onClick={handleClear}
                  disabled={isSaving}
                  className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                >
                  Smazat
                </button>
              )}
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="btn-primary flex-1"
              >
                {isSaving ? 'Ukládám...' : 'Uložit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
