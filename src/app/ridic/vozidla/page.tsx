'use client';

import { useState, useEffect } from 'react';
import { format, differenceInCalendarDays } from 'date-fns';
import { cs } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Repair {
  id: string;
  vehicleId: string;
  date: string;
  description: string;
  price: number | null;
  note: string | null;
}

interface Vehicle {
  id: string;
  spz: string;
  name: string;
  currentKm: number;
  oilKm: number;
  oilLastKm: number;
  oilLimitKm: number;
  oilLastReset: string;
  adblueKm: number;
  adblueLastKm: number;
  adblueLimitKm: number;
  adblueLastReset: string;
  brakesKm: number;
  brakesLastKm: number;
  brakesLimitKm: number;
  brakesLastReset: string;
  bearingsKm: number;
  bearingsLastKm: number;
  bearingsLimitKm: number;
  bearingsLastReset: string;
  brakeFluidDate: string | null;
  brakeFluidLastDate: string | null;
  brakeFluidLimitMonths: number;
  greenCardDate: string | null;
  greenCardLimitMonths: number;
  fridexDate: string | null;
  fridexLastDate: string | null;
  fridexLimitMonths: number;
  technicalInspectionDate: string | null;
  highwayVignetteDate: string | null;
}

export default function DriverVehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [repairs, setRepairs] = useState<Repair[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedVehicle, setExpandedVehicle] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [vehiclesRes, repairsRes] = await Promise.all([
          fetch('/api/vehicles'),
          fetch('/api/repairs'),
        ]);
        if (vehiclesRes.ok) {
          setVehicles(await vehiclesRes.json());
        }
        if (repairsRes.ok) {
          setRepairs(await repairsRes.json());
        }
      } catch (error) {
        console.error('Chyba při načítání:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const getGreenCardStatus = (date: string | null, limitMonths: number) => {
    if (!date) {
      return { status: 'unknown', text: 'Nenastaveno', percentage: 0, daysRemaining: null, limitMonths };
    }
    const expirationDate = new Date(date);
    const now = new Date();
    const daysRemaining = differenceInCalendarDays(expirationDate, now);
    const startDate = new Date(expirationDate);
    startDate.setMonth(startDate.getMonth() - limitMonths);
    const totalDays = differenceInCalendarDays(expirationDate, startDate);
    const daysUsed = differenceInCalendarDays(now, startDate);
    const percentage = totalDays > 0 ? Math.max(0, Math.min((daysUsed / totalDays) * 100, 100)) : 0;

    if (daysRemaining <= 0) {
      return { status: 'expired', text: 'Propadlá!', percentage: 100, daysRemaining: 0, limitMonths };
    }
    if (daysRemaining <= 14) {
      return { status: 'soon', text: `${daysRemaining} dní`, percentage, daysRemaining, limitMonths };
    }
    return { status: 'ok', text: format(expirationDate, 'd.M.yyyy', { locale: cs }), percentage, daysRemaining, limitMonths };
  };

  const getBrakeFluidDateStatus = (date: string | null, limitMonths: number) => getGreenCardStatus(date, limitMonths);
  const getFridexDateStatus = (date: string | null, limitMonths: number) => getGreenCardStatus(date, limitMonths);

  const getTechnicalStatus = (date: string | null) => {
    if (!date) {
      return { status: 'unknown', text: 'Nenastaveno', percentage: 0, daysRemaining: null };
    }
    const inspectionDate = new Date(date);
    const now = new Date();
    const daysRemaining = differenceInCalendarDays(inspectionDate, now);
    const startDate = new Date(inspectionDate);
    startDate.setFullYear(startDate.getFullYear() - 2);
    const totalDays = differenceInCalendarDays(inspectionDate, startDate);
    const daysUsed = differenceInCalendarDays(now, startDate);
    const percentage = totalDays > 0 ? Math.max(0, Math.min((daysUsed / totalDays) * 100, 100)) : 0;

    if (daysRemaining <= 0) {
      return { status: 'expired', text: 'Propadlá!', percentage: 100, daysRemaining: 0 };
    }
    if (daysRemaining <= 60) {
      return { status: 'soon', text: `${daysRemaining} dní`, percentage, daysRemaining };
    }
    return { status: 'ok', text: format(inspectionDate, 'd.M.yyyy', { locale: cs }), percentage, daysRemaining };
  };

  const getVignetteStatus = (date: string | null) => getGreenCardStatus(date, 12);

  const TachoProgressBar = ({ targetKm, lastServiceKm, currentKm, intervalKm, label, icon, warningKm = 1000 }: {
    targetKm: number; lastServiceKm: number; currentKm: number; intervalKm: number; label: string; icon: string;
    warningKm?: number;
  }) => {
    if (targetKm === 0) {
      return (
        <div className="p-2 rounded-lg bg-gray-50">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-600 flex items-center gap-1">
              <span>{icon}</span>
              <span>{label}</span>
            </span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden mb-1" />
          <div className="text-xs text-gray-400 text-right">Nenastaveno</div>
        </div>
      );
    }

    const remaining = targetKm - currentKm;
    const startKm = targetKm - intervalKm;
    const elapsed = currentKm - startKm;
    const percentage = intervalKm > 0 ? Math.min(Math.max((elapsed / intervalKm) * 100, 0), 100) : 0;
    const needsAttention = remaining <= 0;
    const nearLimit = remaining > 0 && remaining <= warningKm;

    return (
      <div className={cn(
        'p-2 rounded-lg',
        needsAttention ? 'bg-red-50' : nearLimit ? 'bg-orange-50' : 'bg-gray-50'
      )}>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-600 flex items-center gap-1">
            <span>{icon}</span>
            <span>{label}</span>
          </span>
          <div className="flex items-center gap-1">
            {needsAttention && (
              <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded-full animate-pulse">⚠️ KONTROLA!</span>
            )}
            {nearLimit && !needsAttention && (
              <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-medium rounded-full">Brzy</span>
            )}
          </div>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden mb-1">
          <div
            className={cn('h-full transition-all',
              needsAttention ? 'bg-red-500' : nearLimit ? 'bg-orange-500' : 'bg-green-500'
            )}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <div className="text-xs text-gray-500 text-right">
          {needsAttention
            ? `Překročeno o ${Math.abs(remaining).toLocaleString('cs-CZ')} km`
            : `Zbývá ${remaining.toLocaleString('cs-CZ')} km (tach. ${targetKm.toLocaleString('cs-CZ')} km)`
          }
        </div>
        {lastServiceKm > 0 && (
          <div className="text-[10px] text-gray-400 text-right">
            Poslední výměna: {lastServiceKm.toLocaleString('cs-CZ')} km
          </div>
        )}
      </div>
    );
  };

  const DateProgressBar = ({
    label,
    icon,
    percentage,
    text,
    status,
    daysRemaining,
    limitMonths,
    lastDate,
  }: {
    label: string;
    icon: string;
    percentage: number;
    text: string;
    status: string;
    daysRemaining: number | null;
    limitMonths?: number;
    lastDate?: string | null;
  }) => {
    const needsAttention = status === 'expired';
    const nearLimit = status === 'soon';
    const displayPercentage = status !== 'unknown' ? Math.max(3, percentage) : 0;

    return (
      <div className={cn(
        'p-2 rounded-lg',
        needsAttention ? 'bg-red-50' : nearLimit ? 'bg-orange-50' : 'bg-gray-50'
      )}>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-600 flex items-center gap-1">
            <span>{icon}</span>
            <span>{label}</span>
          </span>
          {needsAttention && (
            <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded-full animate-pulse">
              ⚠️
            </span>
          )}
          {nearLimit && (
            <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-medium rounded-full">
              Brzy
            </span>
          )}
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden mb-1">
          <div
            className={cn(
              'h-full transition-all',
              needsAttention ? 'bg-red-500' : nearLimit ? 'bg-orange-500' : 'bg-green-500'
            )}
            style={{ width: `${displayPercentage}%` }}
          />
        </div>
        <div className="text-xs text-gray-500 text-right">
          {status === 'unknown'
            ? 'Nenastaveno'
            : status === 'expired'
              ? text
              : `${text} (${daysRemaining} dní)`
          }
        </div>
        {lastDate && (
          <div className="text-[10px] text-gray-400 text-right">
            Výměna: {format(new Date(lastDate), 'd.M.yyyy', { locale: cs })}
          </div>
        )}
        {!lastDate && limitMonths && (
          <div className="text-[10px] text-gray-400 text-right">
            po {limitMonths} měs.
          </div>
        )}
      </div>
    );
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
        <h1 className="text-2xl font-bold text-gray-900">Vozidla</h1>
        <p className="text-gray-600 mt-1">Přehled stavu vozového parku (pouze ke čtení)</p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {vehicles.map((vehicle) => {
          const greenCardStatus = getGreenCardStatus(vehicle.greenCardDate, vehicle.greenCardLimitMonths);
          const technicalStatus = getTechnicalStatus(vehicle.technicalInspectionDate);
          const vignetteStatus = getVignetteStatus(vehicle.highwayVignetteDate);
          const needsAttention =
            (vehicle.oilKm > 0 && (vehicle.oilKm - vehicle.currentKm) <= 1000) ||
            (vehicle.adblueLimitKm > 0 && vehicle.adblueKm > 0 && (vehicle.adblueKm - vehicle.currentKm) <= 100) ||
            (vehicle.brakesKm > 0 && (vehicle.brakesKm - vehicle.currentKm) <= 1000) ||
            (vehicle.bearingsKm > 0 && (vehicle.bearingsKm - vehicle.currentKm) <= 1000) ||
            ['expired', 'soon'].includes(getBrakeFluidDateStatus(vehicle.brakeFluidDate, vehicle.brakeFluidLimitMonths).status) ||
            ['expired', 'soon'].includes(getFridexDateStatus(vehicle.fridexDate, vehicle.fridexLimitMonths).status) ||
            ['expired', 'soon'].includes(greenCardStatus.status) ||
            ['expired', 'soon'].includes(technicalStatus.status) ||
            ['expired', 'soon'].includes(vignetteStatus.status);
          const isExpanded = expandedVehicle === vehicle.id;
          const vehicleRepairs = repairs.filter(r => r.vehicleId === vehicle.id);

          return (
            <div
              key={vehicle.id}
              className={cn(
                'card border-2 transition-all',
                needsAttention ? 'border-red-300 bg-red-50/30' : 'border-gray-100'
              )}
            >
              <div
                className="cursor-pointer mb-4"
                onClick={() => setExpandedVehicle(isExpanded ? null : vehicle.id)}
              >
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="font-bold text-lg text-gray-900">{vehicle.name}</div>
                  <div className="font-mono text-gray-600">{vehicle.spz}</div>
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-sm font-medium rounded-full">
                    🔧 {vehicle.currentKm > 0 ? `${vehicle.currentKm.toLocaleString('cs-CZ')} km` : 'Bez km'}
                  </span>
                  <span className="text-gray-400 text-sm">{isExpanded ? '▼ skrýt detail' : '▶ detail'}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                <TachoProgressBar
                  targetKm={vehicle.oilKm}
                  lastServiceKm={vehicle.oilLastKm}
                  currentKm={vehicle.currentKm}
                  intervalKm={vehicle.oilLimitKm}
                  label="Olej"
                  icon="🛢️"
                />
                {vehicle.adblueLimitKm > 0 && (
                  <TachoProgressBar
                    targetKm={vehicle.adblueKm}
                    lastServiceKm={vehicle.adblueLastKm}
                    currentKm={vehicle.currentKm}
                    intervalKm={vehicle.adblueLimitKm}
                    label="AdBlue"
                    icon="💧"
                    warningKm={100}
                  />
                )}
                <TachoProgressBar
                  targetKm={vehicle.brakesKm}
                  lastServiceKm={vehicle.brakesLastKm}
                  currentKm={vehicle.currentKm}
                  intervalKm={vehicle.brakesLimitKm}
                  label="Brzdy"
                  icon="🛑"
                />
                <TachoProgressBar
                  targetKm={vehicle.bearingsKm}
                  lastServiceKm={vehicle.bearingsLastKm}
                  currentKm={vehicle.currentKm}
                  intervalKm={vehicle.bearingsLimitKm}
                  label="Ložiska"
                  icon="⚙️"
                />
                <DateProgressBar
                  label="Brzd. kap."
                  icon="💦"
                  percentage={getBrakeFluidDateStatus(vehicle.brakeFluidDate, vehicle.brakeFluidLimitMonths).percentage}
                  text={getBrakeFluidDateStatus(vehicle.brakeFluidDate, vehicle.brakeFluidLimitMonths).text}
                  status={getBrakeFluidDateStatus(vehicle.brakeFluidDate, vehicle.brakeFluidLimitMonths).status}
                  daysRemaining={getBrakeFluidDateStatus(vehicle.brakeFluidDate, vehicle.brakeFluidLimitMonths).daysRemaining}
                  limitMonths={vehicle.brakeFluidLimitMonths}
                  lastDate={vehicle.brakeFluidLastDate}
                />
                <DateProgressBar
                  label="Fridex"
                  icon="❄️"
                  percentage={getFridexDateStatus(vehicle.fridexDate, vehicle.fridexLimitMonths).percentage}
                  text={getFridexDateStatus(vehicle.fridexDate, vehicle.fridexLimitMonths).text}
                  status={getFridexDateStatus(vehicle.fridexDate, vehicle.fridexLimitMonths).status}
                  daysRemaining={getFridexDateStatus(vehicle.fridexDate, vehicle.fridexLimitMonths).daysRemaining}
                  limitMonths={vehicle.fridexLimitMonths}
                  lastDate={vehicle.fridexLastDate}
                />
                <DateProgressBar
                  label="Zel. karta"
                  icon="🟢"
                  percentage={greenCardStatus.percentage}
                  text={greenCardStatus.text}
                  status={greenCardStatus.status}
                  daysRemaining={greenCardStatus.daysRemaining}
                  limitMonths={vehicle.greenCardLimitMonths}
                />
                <DateProgressBar
                  label="STK"
                  icon="📋"
                  percentage={technicalStatus.percentage}
                  text={technicalStatus.text}
                  status={technicalStatus.status}
                  daysRemaining={technicalStatus.daysRemaining}
                />
                <DateProgressBar
                  label="Dáln. známka"
                  icon="🛣️"
                  percentage={vignetteStatus.percentage}
                  text={vignetteStatus.text}
                  status={vignetteStatus.status}
                  daysRemaining={vignetteStatus.daysRemaining}
                />
              </div>

              {isExpanded && (
                <div className="border-t pt-4 mt-4 space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="text-gray-500">🛢️ Olej - poslední kontrola</div>
                      <div className="font-medium">{format(new Date(vehicle.oilLastReset), 'd.M.yyyy', { locale: cs })}</div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="text-gray-500">💧 AdBlue - poslední doplnění</div>
                      <div className="font-medium">{format(new Date(vehicle.adblueLastReset), 'd.M.yyyy', { locale: cs })}</div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="text-gray-500">🛑 Brzdy - poslední výměna</div>
                      <div className="font-medium">{format(new Date(vehicle.brakesLastReset), 'd.M.yyyy', { locale: cs })}</div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="text-gray-500">⚙️ Ložiska - poslední výměna</div>
                      <div className="font-medium">{format(new Date(vehicle.bearingsLastReset), 'd.M.yyyy', { locale: cs })}</div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="text-gray-500">💦 Brzdová kapalina</div>
                      <div className="font-medium">
                        {vehicle.brakeFluidLastDate
                          ? `Výměna: ${format(new Date(vehicle.brakeFluidLastDate), 'd.M.yyyy', { locale: cs })}`
                          : 'Nenastaveno'}
                      </div>
                      {vehicle.brakeFluidDate && (
                        <div className="text-xs text-gray-400">
                          Expirace: {format(new Date(vehicle.brakeFluidDate), 'd.M.yyyy', { locale: cs })}
                        </div>
                      )}
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="text-gray-500">❄️ Fridex</div>
                      <div className="font-medium">
                        {vehicle.fridexLastDate
                          ? `Výměna: ${format(new Date(vehicle.fridexLastDate), 'd.M.yyyy', { locale: cs })}`
                          : 'Nenastaveno'}
                      </div>
                      {vehicle.fridexDate && (
                        <div className="text-xs text-gray-400">
                          Expirace: {format(new Date(vehicle.fridexDate), 'd.M.yyyy', { locale: cs })}
                        </div>
                      )}
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="text-gray-500">📋 STK platná do</div>
                      <div className="font-medium">
                        {vehicle.technicalInspectionDate
                          ? format(new Date(vehicle.technicalInspectionDate), 'd.M.yyyy', { locale: cs })
                          : 'Nenastaveno'}
                      </div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="text-gray-500">🛣️ Dálniční známka do</div>
                      <div className="font-medium">
                        {vehicle.highwayVignetteDate
                          ? format(new Date(vehicle.highwayVignetteDate), 'd.M.yyyy', { locale: cs })
                          : 'Nenastaveno'}
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-4 mt-4">
                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      🔧 Historie oprav
                      {vehicleRepairs.length > 0 && (
                        <span className="text-sm font-normal text-gray-500">
                          (celkem: {vehicleRepairs.reduce((sum, r) => sum + (r.price || 0), 0).toLocaleString()} Kč)
                        </span>
                      )}
                    </h3>
                    {vehicleRepairs.length > 0 ? (
                      <div className="space-y-2">
                        {vehicleRepairs.map((repair) => (
                          <div key={repair.id} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-500">
                                  {format(new Date(repair.date), 'd.M.yyyy', { locale: cs })}
                                </span>
                                <span className="font-medium text-gray-900">{repair.description}</span>
                              </div>
                              {repair.note && (
                                <div className="text-sm text-gray-500 mt-1">{repair.note}</div>
                              )}
                            </div>
                            {repair.price && (
                              <span className="font-semibold text-gray-900">
                                {repair.price.toLocaleString()} Kč
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-gray-500 text-sm">Žádné záznamy o opravách</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {vehicles.length === 0 && (
          <div className="py-12 text-center text-gray-500">
            Žádná vozidla v systému
          </div>
        )}
      </div>
    </div>
  );
}
