'use client';

import { useState } from 'react';
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

export type AvailabilityStatus = 'AVAILABLE' | 'UNAVAILABLE' | 'PARTIAL' | null;

export interface DayAvailability {
  date: Date;
  status: AvailabilityStatus;
  note?: string;
}

export interface DayRoute {
  date: Date;
  routeName: string;
}

interface CalendarProps {
  availability: DayAvailability[];
  routes?: DayRoute[];
  onDayClick?: (date: Date, currentStatus: AvailabilityStatus) => void;
  readOnly?: boolean;
}

const statusColors: Record<string, string> = {
  AVAILABLE: 'bg-green-500 text-white hover:bg-green-600',
  UNAVAILABLE: 'bg-red-500 text-white hover:bg-red-600',
  PARTIAL: 'bg-orange-500 text-white hover:bg-orange-600',
};

const statusLabels: Record<string, string> = {
  AVAILABLE: 'Dostupný',
  UNAVAILABLE: 'Nedostupný',
  PARTIAL: 'Částečně',
};

export function Calendar({
  availability,
  routes = [],
  onDayClick,
  readOnly = false,
}: CalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getAvailabilityForDay = (date: Date): DayAvailability | undefined => {
    return availability.find((a) => isSameDay(a.date, date));
  };

  const getRouteForDay = (date: Date): DayRoute | undefined => {
    return routes.find((r) => isSameDay(r.date, date));
  };

  const weekDays = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'];

  return (
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
          <div
            key={day}
            className="text-center text-sm font-medium text-gray-500 py-2"
          >
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const dayAvailability = getAvailabilityForDay(day);
          const dayRoute = getRouteForDay(day);
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const status = dayAvailability?.status || null;
          const hasRoute = !!dayRoute;

          return (
            <button
              key={day.toISOString()}
              onClick={() => !readOnly && onDayClick?.(day, status)}
              disabled={readOnly || !isCurrentMonth}
              className={cn(
                'aspect-square p-2 rounded-lg text-sm font-medium transition-colors relative',
                !isCurrentMonth && 'opacity-30 cursor-not-allowed',
                isCurrentMonth && !status && !hasRoute && 'bg-gray-100 hover:bg-gray-200',
                isCurrentMonth && status && statusColors[status],
                isCurrentMonth && hasRoute && !status && 'bg-blue-500 text-white hover:bg-blue-600',
                isToday(day) && 'ring-2 ring-primary-500 ring-offset-1',
                readOnly && 'cursor-default'
              )}
              title={dayRoute?.routeName}
            >
              <span>{format(day, 'd')}</span>
              {dayAvailability?.note && (
                <span className="absolute bottom-1 right-1 w-2 h-2 bg-white rounded-full" />
              )}
              {hasRoute && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-blue-300 rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-6 flex items-center justify-center flex-wrap gap-4 text-sm">
        <div className="flex items-center space-x-2">
          <span className="w-4 h-4 bg-green-500 rounded" />
          <span>Dostupný</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-4 h-4 bg-orange-500 rounded" />
          <span>Částečně</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-4 h-4 bg-red-500 rounded" />
          <span>Nedostupný</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-4 h-4 bg-blue-500 rounded" />
          <span>Přiřazená trasa</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-4 h-4 bg-gray-200 rounded" />
          <span>Nevyplněno</span>
        </div>
      </div>
    </div>
  );
}

export { statusLabels };
