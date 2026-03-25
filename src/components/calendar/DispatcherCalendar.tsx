'use client';

import { useState, useMemo } from 'react';
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

interface Driver {
  id: string;
  name: string;
  email: string;
  color?: string | null;
}

interface Route {
  id: string;
  name: string;
  date: string;
  status: string;
  plannedKm?: number | null;
  actualKm?: number | null;
  driver?: {
    id: string;
    name: string;
    color?: string | null;
  } | null;
  vehicle?: {
    id: string;
    spz: string;
    name: string;
  } | null;
}

interface AvailabilityData {
  userId: string;
  date: string;
  status: 'AVAILABLE' | 'UNAVAILABLE' | 'PARTIAL';
  note?: string;
}

interface DispatcherCalendarProps {
  drivers: Driver[];
  availability: AvailabilityData[];
  routes?: Route[];
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
  onDayClick?: (date: Date) => void;
}

export interface DriverDayStatus {
  driver: Driver;
  status: 'AVAILABLE' | 'UNAVAILABLE' | 'PARTIAL' | null;
  note?: string;
}

export type { Route as CalendarRoute };

export function DispatcherCalendar({
  drivers,
  availability,
  routes = [],
  currentMonth,
  onMonthChange,
  onDayClick,
}: DispatcherCalendarProps) {
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days = useMemo(
    () => eachDayOfInterval({ start: calendarStart, end: calendarEnd }),
    [calendarStart, calendarEnd]
  );

  const getDriversStatusForDay = (date: Date): DriverDayStatus[] => {
    return drivers.map((driver) => {
      const driverAvailability = availability.find(
        (a) => a.userId === driver.id && isSameDay(new Date(a.date), date)
      );
      return {
        driver,
        status: driverAvailability?.status || null,
        note: driverAvailability?.note,
      };
    });
  };

  const getRoutesForDay = (date: Date): Route[] => {
    return routes.filter((route) => isSameDay(new Date(route.date), date));
  };

  // Počet dostupných řidičů (AVAILABLE = klikl na den)
  const getAvailableCount = (date: Date) => {
    return getDriversStatusForDay(date).filter((s) => s.status === 'AVAILABLE').length;
  };

  const weekDays = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'];

  return (
    <div className="card p-3 sm:p-6">
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <button
          onClick={() => onMonthChange(subMonths(currentMonth, 1))}
          className="btn-secondary text-xs sm:text-sm px-2 sm:px-4"
        >
          &larr; <span className="hidden sm:inline">Předchozí</span>
        </button>
        <h2 className="text-base sm:text-xl font-semibold text-gray-900 capitalize">
          {format(currentMonth, 'LLLL yyyy', { locale: cs })}
        </h2>
        <button
          onClick={() => onMonthChange(addMonths(currentMonth, 1))}
          className="btn-secondary text-xs sm:text-sm px-2 sm:px-4"
        >
          <span className="hidden sm:inline">Další</span> &rarr;
        </button>
      </div>

      <div className="grid grid-cols-7 gap-0.5 sm:gap-1 mb-2">
        {weekDays.map((day) => (
          <div
            key={day}
            className="text-center text-xs sm:text-sm font-medium text-gray-500 py-1 sm:py-2"
          >
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
        {days.map((day) => {
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const driversStatus = getDriversStatusForDay(day);
          const dayRoutes = getRoutesForDay(day);
          const availableCount = getAvailableCount(day);

          // Řidiči kteří jsou dostupní (mají záznam AVAILABLE)
          const availableDrivers = driversStatus.filter((s) => s.status === 'AVAILABLE');

          return (
            <button
              key={day.toISOString()}
              onClick={() => isCurrentMonth && onDayClick?.(day)}
              disabled={!isCurrentMonth}
              className={cn(
                'min-h-[60px] sm:min-h-[120px] p-1 sm:p-2 rounded-lg text-sm transition-colors relative flex flex-col',
                !isCurrentMonth && 'opacity-30 cursor-not-allowed bg-gray-50',
                isCurrentMonth && 'bg-white hover:bg-gray-50 border border-gray-200 shadow-sm',
                isToday(day) && 'ring-2 ring-primary-500 ring-offset-1 border-primary-300'
              )}
            >
              {/* Header: datum + počet dostupných */}
              <div className="flex items-center justify-between mb-0.5 sm:mb-1.5">
                <span
                  className={cn(
                    'font-bold text-xs sm:text-sm w-5 h-5 sm:w-7 sm:h-7 flex items-center justify-center rounded-full',
                    isToday(day) ? 'bg-primary-500 text-white' : 'text-gray-900'
                  )}
                >
                  {format(day, 'd')}
                </span>
                {isCurrentMonth && availableCount > 0 && (
                  <span className="hidden sm:flex text-[10px] font-bold text-gray-500 bg-gray-100 rounded-full px-1.5 py-0.5">
                    {availableCount}
                  </span>
                )}
              </div>

              {/* Trasy - hidden on mobile, shown on desktop */}
              {isCurrentMonth && dayRoutes.length > 0 && (
                <div className="hidden sm:block space-y-0.5 overflow-hidden mb-1 flex-1">
                  {dayRoutes.slice(0, 2).map((route) => (
                    <div
                      key={route.id}
                      className="text-[10px] leading-tight px-1 py-0.5 bg-blue-50 text-blue-800 rounded truncate font-medium"
                      title={`${route.name}${route.driver ? ` - ${route.driver.name}` : ''}`}
                    >
                      {route.name}
                    </div>
                  ))}
                  {dayRoutes.length > 2 && (
                    <div className="text-[10px] text-blue-600 text-center font-medium">
                      +{dayRoutes.length - 2}
                    </div>
                  )}
                </div>
              )}

              {/* Mobile: compact route count indicator */}
              {isCurrentMonth && dayRoutes.length > 0 && (
                <div className="sm:hidden mt-auto">
                  <span className="text-[9px] font-bold text-blue-700 bg-blue-100 rounded px-1">
                    {dayRoutes.length}
                  </span>
                </div>
              )}

              {/* Barevné tečky dostupných řidičů */}
              {isCurrentMonth && availableDrivers.length > 0 && (
                <div className="mt-auto pt-0.5 sm:pt-1 border-t border-gray-100">
                  <div className="flex flex-wrap gap-0.5 justify-center">
                    {availableDrivers.slice(0, 8).map(({ driver }) => (
                      <div
                        key={driver.id}
                        className="w-2 h-2 sm:w-3 sm:h-3 rounded-full"
                        style={{ backgroundColor: driver.color || '#9CA3AF' }}
                        title={`${driver.name}: může`}
                      />
                    ))}
                    {availableDrivers.length > 8 && (
                      <span className="text-[9px] text-gray-400 hidden sm:inline">
                        +{availableDrivers.length - 8}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Legenda — barvy řidičů */}
      <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-gray-200">
        <div className="flex items-center justify-center flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm">
          {drivers.map((driver) => (
            <div key={driver.id} className="flex items-center space-x-1 sm:space-x-2">
              <span
                className="w-3 h-3 sm:w-4 sm:h-4 rounded-full"
                style={{ backgroundColor: driver.color || '#9CA3AF' }}
              />
              <span>{driver.name}</span>
            </div>
          ))}
        </div>
        <p className="text-center text-xs text-gray-400 mt-2">
          Tečka = řidič může v daný den
        </p>
      </div>
    </div>
  );
}
