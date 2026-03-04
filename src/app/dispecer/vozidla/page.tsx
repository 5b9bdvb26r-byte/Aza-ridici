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

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [repairs, setRepairs] = useState<Repair[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [formData, setFormData] = useState({
    spz: '',
    name: '',
    oilLimitKm: '15000',
    adblueLimitKm: '10000',
    brakesLimitKm: '60000',
    bearingsLimitKm: '100000',
    greenCardLimitMonths: '12',
    brakeFluidLimitMonths: '22',
    fridexLimitMonths: '58',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [editKmModal, setEditKmModal] = useState<Vehicle | null>(null);
  const [editKmValue, setEditKmValue] = useState('');
  const [editTargetModal, setEditTargetModal] = useState<{ vehicle: Vehicle; type: 'oil' | 'adblue' | 'brakes' | 'bearings'; label: string } | null>(null);
  const [editTargetValue, setEditTargetValue] = useState('');

  // Modal pro opravu
  const [repairModal, setRepairModal] = useState<Vehicle | null>(null);
  const [repairForm, setRepairForm] = useState({
    description: '',
    price: '',
    note: '',
    date: format(new Date(), 'yyyy-MM-dd'),
  });

  // Modal pro nastavení data
  const [dateModal, setDateModal] = useState<{ vehicle: Vehicle; type: 'technical' | 'greenCard' | 'highwayVignette' | 'brakeFluid' | 'fridex' } | null>(null);
  const [dateValue, setDateValue] = useState('');

  // Potvrzovací modal pro reset
  const [resetConfirm, setResetConfirm] = useState<{
    vehicleId: string;
    vehicleName: string;
    type: 'oil' | 'adblue' | 'brakes' | 'bearings';
    label: string;
  } | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  // Rozbalená karta
  const [expandedVehicle, setExpandedVehicle] = useState<string | null>(null);

  useEffect(() => {
    fetchVehicles();
    fetchRepairs();
  }, []);

  const fetchVehicles = async () => {
    try {
      const response = await fetch('/api/vehicles');
      if (response.ok) {
        const data = await response.json();
        setVehicles(data);
      }
    } catch (error) {
      console.error('Chyba při načítání vozidel:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRepairs = async () => {
    try {
      const response = await fetch('/api/repairs');
      if (response.ok) {
        const data = await response.json();
        setRepairs(data);
      }
    } catch (error) {
      console.error('Chyba při načítání oprav:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const url = editingVehicle
        ? `/api/vehicles/${editingVehicle.id}`
        : '/api/vehicles';
      const method = editingVehicle ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        await fetchVehicles();
        handleCancel();
      }
    } catch (error) {
      console.error('Chyba při ukládání vozidla:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setFormData({
      spz: vehicle.spz,
      name: vehicle.name,
      oilLimitKm: vehicle.oilLimitKm.toString(),
      adblueLimitKm: vehicle.adblueLimitKm.toString(),
      brakesLimitKm: vehicle.brakesLimitKm.toString(),
      bearingsLimitKm: vehicle.bearingsLimitKm.toString(),
      greenCardLimitMonths: vehicle.greenCardLimitMonths.toString(),
      brakeFluidLimitMonths: vehicle.brakeFluidLimitMonths.toString(),
      fridexLimitMonths: vehicle.fridexLimitMonths.toString(),
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Opravdu chcete smazat toto vozidlo?')) return;

    try {
      const response = await fetch(`/api/vehicles/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchVehicles();
      }
    } catch (error) {
      console.error('Chyba při mazání vozidla:', error);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingVehicle(null);
    setFormData({
      spz: '',
      name: '',
      oilLimitKm: '15000',
      adblueLimitKm: '10000',
      brakesLimitKm: '60000',
      bearingsLimitKm: '100000',
      greenCardLimitMonths: '12',
      brakeFluidLimitMonths: '22',
      fridexLimitMonths: '58',
    });
  };

  const resetLabels: Record<string, string> = {
    oil: 'oleje',
    adblue: 'AdBlue',
    brakes: 'brzd',
    bearings: 'ložisek',
  };

  const handleReset = (vehicleId: string, vehicleName: string, type: 'oil' | 'adblue' | 'brakes' | 'bearings') => {
    setResetConfirm({
      vehicleId,
      vehicleName,
      type,
      label: resetLabels[type],
    });
  };

  const confirmReset = async () => {
    if (!resetConfirm) return;
    setIsResetting(true);

    try {
      const response = await fetch(`/api/vehicles/${resetConfirm.vehicleId}/maintenance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset', type: resetConfirm.type }),
      });

      if (response.ok) {
        await fetchVehicles();
      }
    } catch (error) {
      console.error('Chyba při resetování počítadla:', error);
    } finally {
      setIsResetting(false);
      setResetConfirm(null);
    }
  };

  const handleEditKm = async () => {
    if (!editKmModal || !editKmValue) return;

    try {
      const response = await fetch(`/api/vehicles/${editKmModal.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentKm: editKmValue }),
      });

      if (response.ok) {
        await fetchVehicles();
        setEditKmModal(null);
        setEditKmValue('');
      }
    } catch (error) {
      console.error('Chyba při úpravě stavu km:', error);
    }
  };

  const handleEditTarget = async () => {
    if (!editTargetModal || !editTargetValue) return;

    try {
      const response = await fetch(`/api/vehicles/${editTargetModal.vehicle.id}/maintenance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'setTarget', type: editTargetModal.type, km: editTargetValue }),
      });

      if (response.ok) {
        await fetchVehicles();
        setEditTargetModal(null);
        setEditTargetValue('');
      }
    } catch (error) {
      console.error('Chyba při nastavení cíle:', error);
    }
  };

  const handleSetDate = async () => {
    if (!dateModal || !dateValue) return;

    try {
      const response = await fetch(`/api/vehicles/${dateModal.vehicle.id}/maintenance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'setDate', type: dateModal.type, date: dateValue }),
      });

      if (response.ok) {
        await fetchVehicles();
        setDateModal(null);
        setDateValue('');
      }
    } catch (error) {
      console.error('Chyba při nastavení data:', error);
    }
  };

  const handleAddRepair = async () => {
    if (!repairModal || !repairForm.description) return;

    try {
      const response = await fetch('/api/repairs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicleId: repairModal.id,
          ...repairForm,
        }),
      });

      if (response.ok) {
        await fetchRepairs();
        setRepairModal(null);
        setRepairForm({
          description: '',
          price: '',
          note: '',
          date: format(new Date(), 'yyyy-MM-dd'),
        });
      }
    } catch (error) {
      console.error('Chyba při přidávání opravy:', error);
    }
  };

  const handleDeleteRepair = async (repairId: string) => {
    if (!confirm('Opravdu chcete smazat tento záznam o opravě?')) return;

    try {
      const response = await fetch(`/api/repairs/${repairId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchRepairs();
      }
    } catch (error) {
      console.error('Chyba při mazání opravy:', error);
    }
  };


  // Kontrola zelené karty - datum expirace
  const getGreenCardStatus = (date: string | null, limitMonths: number) => {
    if (!date) {
      return { status: 'unknown', text: 'Nenastaveno', percentage: 0, daysRemaining: null, limitMonths };
    }
    const expirationDate = new Date(date);
    const now = new Date();
    const daysRemaining = differenceInCalendarDays(expirationDate, now);
    // Zpětně vypočítat začátek platnosti
    const startDate = new Date(expirationDate);
    startDate.setMonth(startDate.getMonth() - limitMonths);
    const totalDays = differenceInCalendarDays(expirationDate, startDate);
    const daysUsed = differenceInCalendarDays(now, startDate);
    const percentage = totalDays > 0 ? Math.max(0, Math.min((daysUsed / totalDays) * 100, 100)) : 0;

    if (daysRemaining <= 0) {
      return { status: 'expired', text: 'Propadlá!', percentage: 100, daysRemaining: 0, limitMonths };
    }
    if (daysRemaining <= 30) {
      return { status: 'soon', text: `${daysRemaining} dní`, percentage, daysRemaining, limitMonths };
    }
    return { status: 'ok', text: format(expirationDate, 'd.M.yyyy', { locale: cs }), percentage, daysRemaining, limitMonths };
  };

  // Kontrola brzdové kapaliny - datum expirace
  const getBrakeFluidDateStatus = (date: string | null, limitMonths: number) => {
    return getGreenCardStatus(date, limitMonths);
  };

  // Kontrola fridexu - datum expirace
  const getFridexDateStatus = (date: string | null, limitMonths: number) => {
    return getGreenCardStatus(date, limitMonths);
  };

  // Kontrola technické - s progress barem (platnost 2 roky = 24 měsíců)
  const getTechnicalStatus = (date: string | null) => {
    if (!date) {
      return { status: 'unknown', text: 'Nenastaveno', percentage: 0, daysRemaining: null };
    }
    const inspectionDate = new Date(date);
    const now = new Date();
    const daysRemaining = differenceInCalendarDays(inspectionDate, now);
    // Zpětně vypočítat začátek platnosti (2 roky před expirací)
    const startDate = new Date(inspectionDate);
    startDate.setFullYear(startDate.getFullYear() - 2);
    const totalDays = differenceInCalendarDays(inspectionDate, startDate);
    const daysUsed = differenceInCalendarDays(now, startDate);
    const percentage = totalDays > 0 ? Math.max(0, Math.min((daysUsed / totalDays) * 100, 100)) : 0;

    if (daysRemaining <= 0) {
      return { status: 'expired', text: 'Propadlá!', percentage: 100, daysRemaining: 0 };
    }
    if (daysRemaining <= 30) {
      return { status: 'soon', text: `${daysRemaining} dní`, percentage, daysRemaining };
    }
    return { status: 'ok', text: format(inspectionDate, 'd.M.yyyy', { locale: cs }), percentage, daysRemaining };
  };

  // Počet vozidel vyžadujících kontrolu
  // Kontrola dálniční známky (platnost 12 měsíců)
  const getVignetteStatus = (date: string | null) => {
    return getGreenCardStatus(date, 12);
  };

  const alertCount = vehicles.filter((v) => {
    const greenCardStatus = getGreenCardStatus(v.greenCardDate, v.greenCardLimitMonths);
    const technicalStatus = getTechnicalStatus(v.technicalInspectionDate);
    const vignetteStatus = getVignetteStatus(v.highwayVignetteDate);
    return (
      (v.oilKm > 0 && v.currentKm >= v.oilKm) ||
      (v.adblueKm > 0 && v.currentKm >= v.adblueKm) ||
      (v.brakesKm > 0 && v.currentKm >= v.brakesKm) ||
      (v.bearingsKm > 0 && v.currentKm >= v.bearingsKm) ||
      getBrakeFluidDateStatus(v.brakeFluidDate, v.brakeFluidLimitMonths).status === 'expired' ||
      getFridexDateStatus(v.fridexDate, v.fridexLimitMonths).status === 'expired' ||
      greenCardStatus.status === 'expired' ||
      technicalStatus.status === 'expired' ||
      vignetteStatus.status === 'expired'
    );
  }).length;

  // Komponenta pro progress bar podle tachometru
  const TachoProgressBar = ({ targetKm, lastServiceKm, currentKm, intervalKm, label, icon, onEdit }: {
    targetKm: number; lastServiceKm: number; currentKm: number; intervalKm: number; label: string; icon: string;
    onEdit?: () => void;
  }) => {
    // Pokud cíl není nastavený (0), zobrazit "Nenastaveno"
    if (targetKm === 0) {
      return (
        <div className="p-2 rounded-lg bg-gray-50">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-600 flex items-center gap-1">
              <span>{icon}</span>
              <span>{label}</span>
            </span>
            {onEdit && (
              <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="text-xs text-primary-600 hover:text-primary-800">✏️</button>
            )}
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden mb-1" />
          <div className="text-xs text-gray-400 text-right">Nenastaveno</div>
        </div>
      );
    }

    const remaining = targetKm - currentKm;
    // Procento: použij interval jako škálu, start = target - interval
    const startKm = targetKm - intervalKm;
    const elapsed = currentKm - startKm;
    const percentage = intervalKm > 0 ? Math.min(Math.max((elapsed / intervalKm) * 100, 0), 100) : 0;
    const needsAttention = remaining <= 0;
    const nearLimit = remaining > 0 && remaining <= 2000;

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
            {onEdit && (
              <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="text-xs text-primary-600 hover:text-primary-800">✏️</button>
            )}
          </div>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden mb-1">
          <div
            className={cn('h-full transition-all',
              needsAttention ? 'bg-red-500' : nearLimit ? 'bg-orange-500' : percentage > 60 ? 'bg-yellow-500' : 'bg-green-500'
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

  // Komponenta pro datum progress bar (brzdová kapalina, STK)
  const DateProgressBar = ({
    label,
    icon,
    percentage,
    text,
    status,
    daysRemaining,
    limitMonths,
    lastDate,
    onClick
  }: {
    label: string;
    icon: string;
    percentage: number;
    text: string;
    status: string;
    daysRemaining: number | null;
    limitMonths?: number;
    lastDate?: string | null;
    onClick?: () => void;
  }) => {
    const needsAttention = status === 'expired';
    const nearLimit = status === 'soon';
    // Minimální šířka 3% aby byl posuvník vždy viditelný (ne prázdný)
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
          {onClick && (
            <button
              onClick={(e) => { e.stopPropagation(); onClick(); }}
              className="text-xs text-primary-600 hover:text-primary-800"
            >
              ✏️
            </button>
          )}
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden mb-1">
          <div
            className={cn(
              'h-full transition-all',
              needsAttention ? 'bg-red-500' : nearLimit ? 'bg-orange-500' : percentage > 50 ? 'bg-yellow-500' : 'bg-green-500'
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
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vozidla</h1>
          <p className="text-gray-600 mt-1">Správa vozového parku, údržby a servisu</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          + Přidat vozidlo
        </button>
      </div>

      {/* Alert banner */}
      {alertCount > 0 && (
        <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-xl flex items-center gap-3">
          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center text-red-600 text-xl">
            ⚠️
          </div>
          <div>
            <div className="font-semibold text-red-800">
              {alertCount} {alertCount === 1 ? 'vozidlo vyžaduje' : 'vozidla vyžadují'} kontrolu!
            </div>
            <div className="text-sm text-red-600">
              Překročen limit nebo datum expirace
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="card mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {editingVehicle ? 'Upravit vozidlo' : 'Nové vozidlo'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label htmlFor="spz" className="label">
                  SPZ
                </label>
                <input
                  id="spz"
                  type="text"
                  value={formData.spz}
                  onChange={(e) => setFormData({ ...formData, spz: e.target.value })}
                  className="input"
                  placeholder="1AB 2345"
                  required
                />
              </div>
              <div>
                <label htmlFor="name" className="label">
                  Název vozu
                </label>
                <input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input"
                  placeholder="Škoda Octavia"
                  required
                />
              </div>
              <div>
                <label htmlFor="oilLimitKm" className="label">
                  Olej – interval tach. (km)
                </label>
                <input
                  id="oilLimitKm"
                  type="number"
                  value={formData.oilLimitKm}
                  onChange={(e) => setFormData({ ...formData, oilLimitKm: e.target.value })}
                  className="input"
                  placeholder="15000"
                  min="1000"
                />
              </div>
              <div>
                <label htmlFor="adblueLimitKm" className="label">
                  AdBlue – interval tach. (km)
                </label>
                <input
                  id="adblueLimitKm"
                  type="number"
                  value={formData.adblueLimitKm}
                  onChange={(e) => setFormData({ ...formData, adblueLimitKm: e.target.value })}
                  className="input"
                  placeholder="10000"
                  min="1000"
                />
              </div>
              <div>
                <label htmlFor="brakesLimitKm" className="label">
                  Brzdy – interval tach. (km)
                </label>
                <input
                  id="brakesLimitKm"
                  type="number"
                  value={formData.brakesLimitKm}
                  onChange={(e) => setFormData({ ...formData, brakesLimitKm: e.target.value })}
                  className="input"
                  placeholder="60000"
                  min="1000"
                />
              </div>
              <div>
                <label htmlFor="bearingsLimitKm" className="label">
                  Ložiska – interval tach. (km)
                </label>
                <input
                  id="bearingsLimitKm"
                  type="number"
                  value={formData.bearingsLimitKm}
                  onChange={(e) => setFormData({ ...formData, bearingsLimitKm: e.target.value })}
                  className="input"
                  placeholder="100000"
                  min="1000"
                />
              </div>
              <div>
                <label htmlFor="greenCardLimitMonths" className="label">
                  Zelená karta (měsíce)
                </label>
                <input
                  id="greenCardLimitMonths"
                  type="number"
                  value={formData.greenCardLimitMonths}
                  onChange={(e) => setFormData({ ...formData, greenCardLimitMonths: e.target.value })}
                  className="input"
                  placeholder="12"
                  min="1"
                />
              </div>
              <div>
                <label htmlFor="brakeFluidLimitMonths" className="label">
                  Brzd. kapalina (měsíce)
                </label>
                <input
                  id="brakeFluidLimitMonths"
                  type="number"
                  value={formData.brakeFluidLimitMonths}
                  onChange={(e) => setFormData({ ...formData, brakeFluidLimitMonths: e.target.value })}
                  className="input"
                  placeholder="22"
                  min="1"
                />
              </div>
              <div>
                <label htmlFor="fridexLimitMonths" className="label">
                  Fridex (měsíce)
                </label>
                <input
                  id="fridexLimitMonths"
                  type="number"
                  value={formData.fridexLimitMonths}
                  onChange={(e) => setFormData({ ...formData, fridexLimitMonths: e.target.value })}
                  className="input"
                  placeholder="58"
                  min="1"
                />
              </div>
            </div>
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={handleCancel}
                className="btn-secondary"
                disabled={isSaving}
              >
                Zrušit
              </button>
              <button type="submit" className="btn-primary" disabled={isSaving}>
                {isSaving ? 'Ukládání...' : editingVehicle ? 'Uložit změny' : 'Přidat'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Seznam vozidel jako karty */}
      <div className="grid grid-cols-1 gap-4">
        {vehicles.map((vehicle) => {
          const greenCardStatus = getGreenCardStatus(vehicle.greenCardDate, vehicle.greenCardLimitMonths);
          const technicalStatus = getTechnicalStatus(vehicle.technicalInspectionDate);
          const vignetteStatus = getVignetteStatus(vehicle.highwayVignetteDate);
          const needsAttention =
            (vehicle.oilKm > 0 && vehicle.currentKm >= vehicle.oilKm) ||
            (vehicle.adblueKm > 0 && vehicle.currentKm >= vehicle.adblueKm) ||
            (vehicle.brakesKm > 0 && vehicle.currentKm >= vehicle.brakesKm) ||
            (vehicle.bearingsKm > 0 && vehicle.currentKm >= vehicle.bearingsKm) ||
            getBrakeFluidDateStatus(vehicle.brakeFluidDate, vehicle.brakeFluidLimitMonths).status === 'expired' ||
            getFridexDateStatus(vehicle.fridexDate, vehicle.fridexLimitMonths).status === 'expired' ||
            greenCardStatus.status === 'expired' ||
            technicalStatus.status === 'expired' ||
            vignetteStatus.status === 'expired';
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
              {/* Hlavička */}
              <div className="flex items-center justify-between mb-4">
                <div
                  className="cursor-pointer flex-1"
                  onClick={() => setExpandedVehicle(isExpanded ? null : vehicle.id)}
                >
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="font-bold text-lg text-gray-900">{vehicle.name}</div>
                    <div className="font-mono text-gray-600">{vehicle.spz}</div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditKmModal(vehicle);
                        setEditKmValue(vehicle.currentKm.toString());
                      }}
                      className="px-2 py-0.5 bg-blue-100 text-blue-700 text-sm font-medium rounded-full hover:bg-blue-200 transition-colors"
                    >
                      🔧 {vehicle.currentKm > 0 ? `${vehicle.currentKm.toLocaleString('cs-CZ')} km` : 'Nastavit km'}
                    </button>
                    <span className="text-gray-400 text-sm">{isExpanded ? '▼ skrýt detail' : '▶ detail'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setRepairModal(vehicle)}
                    className="px-3 py-1.5 bg-yellow-100 text-yellow-700 rounded-lg text-sm font-medium hover:bg-yellow-200 transition-colors"
                  >
                    + Oprava
                  </button>
                  <button
                    onClick={() => handleEdit(vehicle)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handleDelete(vehicle.id)}
                    className="text-gray-500 hover:text-red-600"
                  >
                    🗑️
                  </button>
                </div>
              </div>

              {/* Přehled s progress bary - VŽDY VIDITELNÉ */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                <TachoProgressBar
                  targetKm={vehicle.oilKm}
                  lastServiceKm={vehicle.oilLastKm}
                  currentKm={vehicle.currentKm}
                  intervalKm={vehicle.oilLimitKm}
                  label="Olej"
                  icon="🛢️"
                  onEdit={() => {
                    setEditTargetModal({ vehicle, type: 'oil', label: 'Olej' });
                    setEditTargetValue(vehicle.oilLastKm.toString());
                  }}
                />
                <TachoProgressBar
                  targetKm={vehicle.adblueKm}
                  lastServiceKm={vehicle.adblueLastKm}
                  currentKm={vehicle.currentKm}
                  intervalKm={vehicle.adblueLimitKm}
                  label="AdBlue"
                  icon="💧"
                  onEdit={() => {
                    setEditTargetModal({ vehicle, type: 'adblue', label: 'AdBlue' });
                    setEditTargetValue(vehicle.adblueLastKm.toString());
                  }}
                />
                <TachoProgressBar
                  targetKm={vehicle.brakesKm}
                  lastServiceKm={vehicle.brakesLastKm}
                  currentKm={vehicle.currentKm}
                  intervalKm={vehicle.brakesLimitKm}
                  label="Brzdy"
                  icon="🛑"
                  onEdit={() => {
                    setEditTargetModal({ vehicle, type: 'brakes', label: 'Brzdy' });
                    setEditTargetValue(vehicle.brakesLastKm.toString());
                  }}
                />
                <TachoProgressBar
                  targetKm={vehicle.bearingsKm}
                  lastServiceKm={vehicle.bearingsLastKm}
                  currentKm={vehicle.currentKm}
                  intervalKm={vehicle.bearingsLimitKm}
                  label="Ložiska"
                  icon="⚙️"
                  onEdit={() => {
                    setEditTargetModal({ vehicle, type: 'bearings', label: 'Ložiska' });
                    setEditTargetValue(vehicle.bearingsLastKm.toString());
                  }}
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
                  onClick={() => {
                    setDateModal({ vehicle, type: 'brakeFluid' });
                    setDateValue(vehicle.brakeFluidLastDate ? format(new Date(vehicle.brakeFluidLastDate), 'yyyy-MM-dd') : '');
                  }}
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
                  onClick={() => {
                    setDateModal({ vehicle, type: 'fridex' });
                    setDateValue(vehicle.fridexLastDate ? format(new Date(vehicle.fridexLastDate), 'yyyy-MM-dd') : '');
                  }}
                />
                <DateProgressBar
                  label="Zel. karta"
                  icon="🟢"
                  percentage={greenCardStatus.percentage}
                  text={greenCardStatus.text}
                  status={greenCardStatus.status}
                  daysRemaining={greenCardStatus.daysRemaining}
                  limitMonths={vehicle.greenCardLimitMonths}
                  onClick={() => {
                    setDateModal({ vehicle, type: 'greenCard' });
                    setDateValue(vehicle.greenCardDate ? format(new Date(vehicle.greenCardDate), 'yyyy-MM-dd') : '');
                  }}
                />
                <DateProgressBar
                  label="STK"
                  icon="📋"
                  percentage={technicalStatus.percentage}
                  text={technicalStatus.text}
                  status={technicalStatus.status}
                  daysRemaining={technicalStatus.daysRemaining}
                  onClick={() => {
                    setDateModal({ vehicle, type: 'technical' });
                    setDateValue(vehicle.technicalInspectionDate ? format(new Date(vehicle.technicalInspectionDate), 'yyyy-MM-dd') : '');
                  }}
                />
                <DateProgressBar
                  label="Dáln. známka"
                  icon="🛣️"
                  percentage={vignetteStatus.percentage}
                  text={vignetteStatus.text}
                  status={vignetteStatus.status}
                  daysRemaining={vignetteStatus.daysRemaining}
                  onClick={() => {
                    setDateModal({ vehicle, type: 'highwayVignette' });
                    setDateValue(vehicle.highwayVignetteDate ? format(new Date(vehicle.highwayVignetteDate), 'yyyy-MM-dd') : '');
                  }}
                />
              </div>

              {/* Rozbalený detail */}
              {isExpanded && (
                <div className="border-t pt-4 mt-4 space-y-4">
                  {/* Tlačítka pro reset */}
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                    <button
                      onClick={() => handleReset(vehicle.id, vehicle.name, 'oil')}
                      className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm transition-colors"
                    >
                      🛢️ Reset oleje
                    </button>
                    <button
                      onClick={() => handleReset(vehicle.id, vehicle.name, 'adblue')}
                      className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm transition-colors"
                    >
                      💧 Reset AdBlue
                    </button>
                    <button
                      onClick={() => handleReset(vehicle.id, vehicle.name, 'brakes')}
                      className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm transition-colors"
                    >
                      🛑 Reset brzd
                    </button>
                    <button
                      onClick={() => handleReset(vehicle.id, vehicle.name, 'bearings')}
                      className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm transition-colors"
                    >
                      ⚙️ Reset ložisek
                    </button>
                  </div>

                  {/* Detailní informace */}
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

                  {/* Historie oprav */}
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
                            <div className="flex items-center gap-3">
                              {repair.price && (
                                <span className="font-semibold text-gray-900">
                                  {repair.price.toLocaleString()} Kč
                                </span>
                              )}
                              <button
                                onClick={() => handleDeleteRepair(repair.id)}
                                className="text-gray-400 hover:text-red-600"
                              >
                                🗑️
                              </button>
                            </div>
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

      {/* Modal pro editaci cílového stavu km */}
      {editTargetModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {editTargetModal.label} – poslední výměna – {editTargetModal.vehicle.name}
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Zadejte stav tachometru při poslední výměně. Cíl se automaticky vypočítá (poslední výměna + interval).
              {editTargetModal.vehicle.currentKm > 0 && (
                <span className="block mt-1 font-medium text-gray-700">
                  Aktuální stav tachometru: {editTargetModal.vehicle.currentKm.toLocaleString('cs-CZ')} km
                </span>
              )}
            </p>
            <input
              type="number"
              value={editTargetValue}
              onChange={(e) => setEditTargetValue(e.target.value)}
              className="input w-full mb-4"
              placeholder="Stav tachometru při poslední výměně (km)"
              min="0"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setEditTargetModal(null);
                  setEditTargetValue('');
                }}
                className="btn-secondary flex-1"
              >
                Zrušit
              </button>
              <button
                onClick={handleEditTarget}
                disabled={!editTargetValue}
                className="btn-primary flex-1"
              >
                Uložit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal pro editaci stavu tachometru */}
      {editKmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Stav tachometru - {editKmModal.name}
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Zadejte konečný stav tachometru vozidla.
            </p>
            <input
              type="number"
              value={editKmValue}
              onChange={(e) => setEditKmValue(e.target.value)}
              className="input w-full mb-4"
              placeholder="Stav tachometru (km)"
              min="0"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setEditKmModal(null);
                  setEditKmValue('');
                }}
                className="btn-secondary flex-1"
              >
                Zrušit
              </button>
              <button
                onClick={handleEditKm}
                disabled={!editKmValue}
                className="btn-primary flex-1"
              >
                Uložit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal pro opravu */}
      {repairModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Nová oprava - {repairModal.name}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="label">Datum</label>
                <input
                  type="date"
                  value={repairForm.date}
                  onChange={(e) => setRepairForm({ ...repairForm, date: e.target.value })}
                  className="input w-full"
                />
              </div>
              <div>
                <label className="label">Popis opravy *</label>
                <input
                  type="text"
                  value={repairForm.description}
                  onChange={(e) => setRepairForm({ ...repairForm, description: e.target.value })}
                  className="input w-full"
                  placeholder="Výměna brzdových destiček"
                  required
                />
              </div>
              <div>
                <label className="label">Cena (Kč)</label>
                <input
                  type="number"
                  value={repairForm.price}
                  onChange={(e) => setRepairForm({ ...repairForm, price: e.target.value })}
                  className="input w-full"
                  placeholder="2500"
                />
              </div>
              <div>
                <label className="label">Poznámka</label>
                <textarea
                  value={repairForm.note}
                  onChange={(e) => setRepairForm({ ...repairForm, note: e.target.value })}
                  className="input w-full"
                  rows={2}
                  placeholder="Další informace..."
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setRepairModal(null);
                  setRepairForm({ description: '', price: '', note: '', date: format(new Date(), 'yyyy-MM-dd') });
                }}
                className="btn-secondary flex-1"
              >
                Zrušit
              </button>
              <button
                onClick={handleAddRepair}
                disabled={!repairForm.description}
                className="btn-primary flex-1"
              >
                Uložit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Potvrzovací modal pro reset */}
      {resetConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center text-2xl">
                ⚠️
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Potvrdit reset
                </h3>
                <p className="text-sm text-gray-500">{resetConfirm.vehicleName}</p>
              </div>
            </div>
            <p className="text-gray-700 mb-6">
              Opravdu chcete resetovat <strong>{resetConfirm.label}</strong>?
              Nastaví nový cíl kontroly na aktuální km + interval.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setResetConfirm(null)}
                className="btn-secondary flex-1"
                disabled={isResetting}
              >
                Zrušit
              </button>
              <button
                onClick={confirmReset}
                disabled={isResetting}
                className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition-colors disabled:opacity-50"
              >
                {isResetting ? 'Resetuji...' : 'Ano, resetovat'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal pro nastavení data */}
      {dateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {dateModal.type === 'technical' && 'Nastavit datum technické kontroly'}
              {dateModal.type === 'greenCard' && 'Nastavit datum expirace zelené karty'}
              {dateModal.type === 'highwayVignette' && 'Nastavit datum expirace dálniční známky'}
              {dateModal.type === 'brakeFluid' && 'Datum poslední výměny brzdové kapaliny'}
              {dateModal.type === 'fridex' && 'Datum poslední výměny fridexu'}
              {' '}- {dateModal.vehicle.name}
            </h3>
            {(dateModal.type === 'brakeFluid' || dateModal.type === 'fridex') && (
              <p className="text-sm text-gray-500 mb-2">
                Zadejte datum poslední výměny. Expirace se automaticky vypočítá ({dateModal.type === 'brakeFluid' ? dateModal.vehicle.brakeFluidLimitMonths : dateModal.vehicle.fridexLimitMonths} měsíců).
              </p>
            )}
            <input
              type="date"
              value={dateValue}
              onChange={(e) => setDateValue(e.target.value)}
              className="input w-full mb-4"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setDateModal(null);
                  setDateValue('');
                }}
                className="btn-secondary flex-1"
              >
                Zrušit
              </button>
              <button
                onClick={handleSetDate}
                disabled={!dateValue}
                className="btn-primary flex-1"
              >
                Uložit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
