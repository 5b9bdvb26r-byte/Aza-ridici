'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  startOfMonth,
  endOfMonth,
  addMonths,
  isSameDay,
} from 'date-fns';
import {
  DispatcherCalendar,
  DriverDayStatus,
  CalendarRoute,
} from '@/components/calendar/DispatcherCalendar';
import { DayDetailModal } from '@/components/calendar/DayDetailModal';

interface Driver {
  id: string;
  name: string;
  email: string;
  color?: string | null;
}

interface AvailabilityData {
  userId: string;
  date: string;
  status: 'AVAILABLE' | 'UNAVAILABLE' | 'PARTIAL';
  note?: string;
}

export default function DispatcherDashboard() {
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [availability, setAvailability] = useState<AvailabilityData[]>([]);
  const [routes, setRoutes] = useState<CalendarRoute[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDayDate, setSelectedDayDate] = useState<Date | null>(null);

  const driversLoadedRef = useRef(false);

  const monthStart = useMemo(() => startOfMonth(currentMonth), [currentMonth]);
  const monthEnd = useMemo(() => endOfMonth(currentMonth), [currentMonth]);

  const fetchDrivers = useCallback(async () => {
    if (driversLoadedRef.current) return;

    try {
      const response = await fetch('/api/drivers');
      if (response.ok) {
        const data = await response.json();
        setDrivers(data);
        driversLoadedRef.current = true;
      }
    } catch (error) {
      console.error('Chyba při načítání řidičů:', error);
    }
  }, []);

  const fetchAvailability = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/availability/all?start=${monthStart.toISOString()}&end=${addMonths(monthEnd, 1).toISOString()}`
      );
      if (response.ok) {
        const data = await response.json();
        setAvailability(data);
      }
    } catch (error) {
      console.error('Chyba při načítání dostupnosti:', error);
    }
  }, [monthStart, monthEnd]);

  const fetchRoutes = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/routes?start=${monthStart.toISOString()}&end=${addMonths(monthEnd, 1).toISOString()}`
      );
      if (response.ok) {
        const data = await response.json();
        setRoutes(data);
      }
    } catch (error) {
      console.error('Chyba při načítání tras:', error);
    }
  }, [monthStart, monthEnd]);

  // Automatické dokončení tras s datem v minulosti
  const autoCompleteRoutes = useCallback(async () => {
    try {
      await fetch('/api/routes/auto-complete', { method: 'POST' });
    } catch (error) {
      console.error('Chyba při automatickém dokončování tras:', error);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      // Nejprve automaticky dokončit staré trasy
      await autoCompleteRoutes();
      // Pak načíst data
      await Promise.all([fetchDrivers(), fetchAvailability(), fetchRoutes()]);
      setIsLoading(false);
    };
    loadData();
  }, [fetchDrivers, fetchAvailability, fetchRoutes, autoCompleteRoutes]);

  const handleMonthChange = (newMonth: Date) => {
    setCurrentMonth(newMonth);
  };

  const handleDayClick = (date: Date) => {
    setSelectedDayDate(date);
  };

  // Compute modal data dynamically from current state so it stays fresh
  const selectedDayData = useMemo(() => {
    if (!selectedDayDate) return null;
    const driversStatus: DriverDayStatus[] = drivers.map((driver) => {
      const driverAvailability = availability.find(
        (a) => a.userId === driver.id && isSameDay(new Date(a.date), selectedDayDate)
      );
      return {
        driver,
        status: driverAvailability?.status || null,
        note: driverAvailability?.note,
      };
    });
    const dayRoutes = routes.filter((route) =>
      isSameDay(new Date(route.date), selectedDayDate)
    );
    return { date: selectedDayDate, driversStatus, routes: dayRoutes };
  }, [selectedDayDate, drivers, availability, routes]);

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
        <h1 className="text-2xl font-bold text-gray-900">
          Přehled dostupnosti řidičů
        </h1>
        <p className="text-gray-600 mt-1">
          Klikněte na den pro zobrazení detailu dostupnosti
        </p>
      </div>

      <DispatcherCalendar
        drivers={drivers}
        availability={availability}
        routes={routes}
        currentMonth={currentMonth}
        onMonthChange={handleMonthChange}
        onDayClick={handleDayClick}
      />

      <div className="mt-6 card">
        <h3 className="font-semibold text-gray-900 mb-3">Řidiči v systému</h3>
        <div className="flex flex-wrap gap-2">
          {drivers.map((driver) => (
            <div
              key={driver.id}
              className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-700"
            >
              <span
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: driver.color || '#9CA3AF' }}
              />
              {driver.name}
            </div>
          ))}
          {drivers.length === 0 && (
            <p className="text-gray-500 text-sm">Žádní řidiči v systému</p>
          )}
        </div>
      </div>

      {selectedDayData && (
        <DayDetailModal
          date={selectedDayData.date}
          driversStatus={selectedDayData.driversStatus}
          routes={selectedDayData.routes}
          onClose={() => setSelectedDayDate(null)}
          onAvailabilityChange={() => {
            fetchAvailability();
          }}
        />
      )}
    </div>
  );
}
