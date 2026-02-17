'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { format, startOfDay, isToday, isTomorrow, isPast, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';
import { cs } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Driver {
  id: string;
  name: string;
  color?: string | null;
}

interface Vehicle {
  id: string;
  name: string;
  spz: string;
}

interface Order {
  id?: string;
  orderNumber: string;
  price: string;
  deliveryTime: string;
  note: string;
}

interface DailyReport {
  id: string;
  actualKm: number;
  fuelCost: number;
  carCheck: string;
  carCheckNote: string | null;
  createdAt: string;
}

interface Route {
  id: string;
  name: string;
  mapUrl: string | null;
  plannedKm: number | null;
  actualKm: number | null;
  date: string;
  arrivalFrom: string | null;
  arrivalTo: string | null;
  note: string | null;
  status: string;
  confirmed: boolean;
  complaintCount: number;
  fuelCost: number;
  driverPay: number;
  driver: Driver | null;
  vehicle: Vehicle | null;
  orders?: Order[];
  dailyReport?: DailyReport | null;
}

interface Availability {
  userId: string;
  date: string;
  status: 'AVAILABLE' | 'UNAVAILABLE' | 'PARTIAL';
  note?: string;
}

type TabType = 'planned' | 'pending' | 'completed';

const availabilityColors: Record<string, { bg: string; text: string; label: string }> = {
  AVAILABLE: { bg: 'bg-green-100', text: 'text-green-700', label: 'Dostupný' },
  PARTIAL: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Částečně' },
  UNAVAILABLE: { bg: 'bg-red-100', text: 'text-red-700', label: 'Nedostupný' },
};

const emptyOrder = (): Order => ({
  orderNumber: '',
  price: '',
  deliveryTime: '',
  note: '',
});

export default function RoutesPage() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingRoute, setEditingRoute] = useState<Route | null>(null);
  const [expandedRoutes, setExpandedRoutes] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<TabType>('planned');
  const [formData, setFormData] = useState({
    name: '',
    mapUrl: '',
    plannedKm: '',
    actualKm: '',
    date: '',
    arrivalFrom: '',
    arrivalTo: '',
    driverId: '',
    vehicleId: '',
    note: '',
    status: 'PLANNED',
    complaintCount: '0',
    driverPay: '2500',
  });
  const [orders, setOrders] = useState<Order[]>([emptyOrder()]);
  const [isSaving, setIsSaving] = useState(false);

  // Filtry pro hotové trasy
  const [filterMonth, setFilterMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [filterDriver, setFilterDriver] = useState('');

  // Modal pro dokončení jízdy
  const [completeModal, setCompleteModal] = useState<Route | null>(null);
  const [actualKmInput, setActualKmInput] = useState('');

  // Tisk
  const [printRoutes, setPrintRoutes] = useState<Route[] | null>(null);
  const [printTitle, setPrintTitle] = useState('');
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrintDay = (dayRoutes: Route[], label: string) => {
    setPrintRoutes(dayRoutes);
    setPrintTitle(label);
    setTimeout(() => window.print(), 100);
  };

  const handlePrintAllPlanned = () => {
    setPrintRoutes(plannedRoutes);
    setPrintTitle('Plánované trasy');
    setTimeout(() => window.print(), 100);
  };

  // Po tisku schovat tiskový obsah
  useEffect(() => {
    const afterPrint = () => setPrintRoutes(null);
    window.addEventListener('afterprint', afterPrint);
    return () => window.removeEventListener('afterprint', afterPrint);
  }, []);

  useEffect(() => {
    Promise.all([fetchRoutes(), fetchDrivers(), fetchVehicles(), fetchAvailability()]).then(() => {
      setIsLoading(false);
    });
  }, []);

  useEffect(() => {
    if (formData.date) {
      fetchAvailabilityForDate(formData.date);
    }
  }, [formData.date]);

  // Když se změní filtr v hotových, přenačti
  useEffect(() => {
    if (activeTab === 'completed') {
      fetchRoutes();
    }
  }, [filterMonth, filterDriver]);

  const fetchRoutes = async () => {
    try {
      const params = new URLSearchParams();

      // Pro hotové trasy filtrujeme dle měsíce
      if (activeTab === 'completed' || filterMonth) {
        const [year, month] = filterMonth.split('-').map(Number);
        const start = startOfMonth(new Date(year, month - 1));
        const end = endOfMonth(new Date(year, month - 1));
        // Při načtení stránky nechceme omezovat na měsíc (potřebujeme plánované)
        // Proto posíláme jen pokud jsme na hotových
      }

      if (filterDriver) {
        params.set('driverId', filterDriver);
      }

      const response = await fetch(`/api/routes?${params}`);
      if (response.ok) {
        const data = await response.json();
        setRoutes(data);
      }
    } catch (error) {
      console.error('Chyba při načítání tras:', error);
    }
  };

  const fetchDrivers = async () => {
    try {
      const response = await fetch('/api/drivers');
      if (response.ok) {
        const data = await response.json();
        setDrivers(data);
      }
    } catch (error) {
      console.error('Chyba při načítání řidičů:', error);
    }
  };

  const fetchVehicles = async () => {
    try {
      const response = await fetch('/api/vehicles');
      if (response.ok) {
        const data = await response.json();
        setVehicles(data);
      }
    } catch (error) {
      console.error('Chyba při načítání vozidel:', error);
    }
  };

  const fetchAvailability = async () => {
    try {
      const start = startOfMonth(new Date());
      const end = endOfMonth(addMonths(new Date(), 3));
      const response = await fetch(
        `/api/availability/all?start=${start.toISOString()}&end=${end.toISOString()}`
      );
      if (response.ok) {
        const data = await response.json();
        setAvailability(data);
      }
    } catch (error) {
      console.error('Chyba při načítání dostupnosti:', error);
    }
  };

  const fetchAvailabilityForDate = async (date: string) => {
    try {
      const dateObj = new Date(date);
      const response = await fetch(
        `/api/availability/all?start=${dateObj.toISOString()}&end=${dateObj.toISOString()}`
      );
      if (response.ok) {
        const data = await response.json();
        setAvailability((prev) => {
          const filtered = prev.filter(
            (a) => !data.some((d: Availability) => d.userId === a.userId && d.date === a.date)
          );
          return [...filtered, ...data];
        });
      }
    } catch (error) {
      console.error('Chyba při načítání dostupnosti:', error);
    }
  };

  const getDriverAvailability = (driverId: string, date: string): Availability | null => {
    if (!date) return null;
    const dateStr = new Date(date).toISOString().split('T')[0];
    return (
      availability.find((a) => {
        const availDateStr = new Date(a.date).toISOString().split('T')[0];
        return a.userId === driverId && availDateStr === dateStr;
      }) || null
    );
  };

  // Objednávky helpers
  const addOrderRow = () => setOrders([...orders, emptyOrder()]);
  const removeOrderRow = (index: number) => {
    if (orders.length === 1) { setOrders([emptyOrder()]); return; }
    setOrders(orders.filter((_, i) => i !== index));
  };
  const updateOrder = (index: number, field: keyof Order, value: string) => {
    const newOrders = [...orders];
    newOrders[index] = { ...newOrders[index], [field]: value };
    setOrders(newOrders);
  };

  const toggleRoute = (id: string) => {
    setExpandedRoutes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // Výpočty formuláře
  const ordersTotal = orders.reduce((sum, o) => sum + (parseFloat(o.price) || 0), 0);
  const driverPayNum = parseFloat(formData.driverPay) || 0;
  const profit = ordersTotal - driverPayNum;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const url = editingRoute ? `/api/routes/${editingRoute.id}` : '/api/routes';
      const method = editingRoute ? 'PUT' : 'POST';
      const validOrders = orders.filter((o) => o.orderNumber.trim() !== '');
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, orders: validOrders }),
      });
      if (response.ok) { await fetchRoutes(); handleCancel(); }
    } catch (error) {
      console.error('Chyba při ukládání trasy:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (route: Route) => {
    setEditingRoute(route);
    setFormData({
      name: route.name,
      mapUrl: route.mapUrl || '',
      plannedKm: route.plannedKm?.toString() || '',
      actualKm: route.actualKm?.toString() || '',
      date: route.date.split('T')[0],
      arrivalFrom: route.arrivalFrom || '',
      arrivalTo: route.arrivalTo || '',
      driverId: route.driver?.id || '',
      vehicleId: route.vehicle?.id || '',
      note: route.note || '',
      status: route.status,
      complaintCount: route.complaintCount?.toString() || '0',
      driverPay: route.driverPay ? route.driverPay.toString() : '2500',
    });
    if (route.orders && route.orders.length > 0) {
      setOrders(route.orders.map((o) => ({
        id: o.id, orderNumber: o.orderNumber, price: o.price?.toString() || '',
        deliveryTime: o.deliveryTime || '', note: o.note || '',
      })));
    } else {
      setOrders([emptyOrder()]);
    }
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Opravdu chcete smazat tuto trasu?')) return;
    try {
      const response = await fetch(`/api/routes/${id}`, { method: 'DELETE' });
      if (response.ok) await fetchRoutes();
    } catch (error) {
      console.error('Chyba při mazání trasy:', error);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingRoute(null);
    setFormData({
      name: '', mapUrl: '', plannedKm: '', actualKm: '', date: '', arrivalFrom: '', arrivalTo: '', driverId: '',
      vehicleId: '', note: '', status: 'PLANNED', complaintCount: '0', driverPay: '2500',
    });
    setOrders([emptyOrder()]);
  };

  const handleStatusChange = async (route: Route, newStatus: string) => {
    if (newStatus === 'COMPLETED' && !route.actualKm) {
      setCompleteModal(route);
      setActualKmInput(route.plannedKm?.toString() || '');
      return;
    }
    try {
      const response = await fetch(`/api/routes/${route.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...route, date: route.date.split('T')[0],
          driverId: route.driver?.id || '', vehicleId: route.vehicle?.id || '', status: newStatus,
        }),
      });
      if (response.ok) await fetchRoutes();
    } catch (error) {
      console.error('Chyba při změně stavu:', error);
    }
  };

  const handleCompleteRoute = async () => {
    if (!completeModal) return;
    try {
      const response = await fetch(`/api/routes/${completeModal.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...completeModal, date: completeModal.date.split('T')[0],
          driverId: completeModal.driver?.id || '', vehicleId: completeModal.vehicle?.id || '',
          actualKm: actualKmInput, status: 'COMPLETED',
        }),
      });
      if (response.ok) { await fetchRoutes(); setCompleteModal(null); setActualKmInput(''); }
    } catch (error) {
      console.error('Chyba při dokončování trasy:', error);
    }
  };

  const getSortedDrivers = () => {
    if (!formData.date) return drivers;
    return [...drivers].sort((a, b) => {
      const aAvail = getDriverAvailability(a.id, formData.date);
      const bAvail = getDriverAvailability(b.id, formData.date);
      const order = { AVAILABLE: 0, PARTIAL: 1, UNAVAILABLE: 2 };
      const aOrder = aAvail ? order[aAvail.status] : 3;
      const bOrder = bAvail ? order[bAvail.status] : 3;
      return aOrder - bOrder;
    });
  };

  // ===== ROZŘAZENÍ TRAS DO ZÁLOŽEK =====

  // Plánované = status PLANNED nebo IN_PROGRESS (ještě nemají report)
  const plannedRoutes = useMemo(() => {
    return routes
      .filter((r) => r.status === 'PLANNED' || r.status === 'IN_PROGRESS')
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [routes]);

  // Neukončené = trasy BEZ daily reportu a jsou prošlé (datum v minulosti) nebo COMPLETED bez reportu
  const pendingRoutes = useMemo(() => {
    return routes
      .filter((r) => {
        const hasReport = r.dailyReport != null;
        if (hasReport) return false;
        // Prošlé plánované/probíhající BEZ reportu
        const routeDate = startOfDay(new Date(r.date));
        const isPastRoute = isPast(routeDate) && !isToday(routeDate);
        // COMPLETED bez reportu
        return isPastRoute || r.status === 'COMPLETED';
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [routes]);

  // Hotové = trasy S daily reportem (filtrované dle měsíce)
  const completedRoutes = useMemo(() => {
    const [year, month] = filterMonth.split('-').map(Number);
    const monthStart = startOfMonth(new Date(year, month - 1));
    const monthEnd = endOfMonth(new Date(year, month - 1));

    return routes
      .filter((r) => {
        if (!r.dailyReport) return false;
        const routeDate = new Date(r.date);
        // Filtr dle měsíce
        if (routeDate < monthStart || routeDate > monthEnd) return false;
        // Filtr dle řidiče
        if (filterDriver && r.driver?.id !== filterDriver) return false;
        return true;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [routes, filterMonth, filterDriver]);

  // Seskupit plánované dle data
  const groupedPlanned = useMemo(() => {
    const groups: { date: Date; dateStr: string; label: string; routes: Route[] }[] = [];
    const dateMap = new Map<string, Route[]>();

    plannedRoutes.forEach((r) => {
      const key = r.date.split('T')[0];
      if (!dateMap.has(key)) dateMap.set(key, []);
      dateMap.get(key)!.push(r);
    });

    const sortedKeys = Array.from(dateMap.keys()).sort();
    sortedKeys.forEach((key) => {
      const date = new Date(key);
      let label = format(date, 'EEEE d. MMMM', { locale: cs });
      if (isToday(date)) label = `Dnes – ${label}`;
      else if (isTomorrow(date)) label = `Zítra – ${label}`;
      else if (isPast(startOfDay(date))) label = `⚠ PROŠLÉ – ${label}`;

      groups.push({ date, dateStr: key, label, routes: dateMap.get(key)! });
    });

    return groups;
  }, [plannedRoutes]);

  // Statistiky pro hotové
  const completedStats = useMemo(() => {
    const totalOrders = completedRoutes.reduce(
      (sum, r) => sum + (r.orders?.reduce((s, o) => s + (parseFloat(o.price?.toString()) || 0), 0) || 0), 0);
    const totalFuel = completedRoutes.reduce((sum, r) => {
      const reportFuel = r.dailyReport?.fuelCost || 0;
      return sum + (reportFuel > 0 ? reportFuel : (r.fuelCost || 0));
    }, 0);
    const totalDriverPay = completedRoutes.reduce((sum, r) => sum + (r.driverPay || 0), 0);
    const totalKm = completedRoutes.reduce((sum, r) => sum + (r.actualKm || r.plannedKm || 0), 0);
    const totalProfit = totalOrders - totalFuel - totalDriverPay;
    return { totalOrders, totalFuel, totalDriverPay, totalKm, totalProfit, count: completedRoutes.length };
  }, [completedRoutes]);

  // Měsíce pro výběr
  const monthOptions = useMemo(() => {
    const opts = [];
    for (let i = 0; i < 12; i++) {
      const d = subMonths(new Date(), i);
      opts.push({
        value: format(d, 'yyyy-MM'),
        label: format(d, 'LLLL yyyy', { locale: cs }),
      });
    }
    return opts;
  }, []);

  // Počty pro badge na záložkách
  const plannedCount = plannedRoutes.length;
  const pendingCount = pendingRoutes.length;
  const completedCount = completedRoutes.length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Načítání...</div>
      </div>
    );
  }

  return (
    <div>
      <div className={printRoutes ? 'no-print' : ''}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Trasy</h1>
          <p className="text-gray-600 mt-1">Plánování a správa tras</p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'planned' && plannedRoutes.length > 0 && (
            <button onClick={handlePrintAllPlanned}
              className="btn-secondary flex items-center gap-1.5 no-print">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Tisk
            </button>
          )}
          <button onClick={() => { setShowForm(true); setActiveTab('planned'); }} className="btn-primary no-print">
            + Nová trasa
          </button>
        </div>
      </div>

      {/* ===== FORMULÁŘ ===== */}
      {showForm && (
        <div className="card mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {editingRoute ? 'Upravit trasu' : 'Nová trasa'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="name" className="label">Název trasy *</label>
                <input id="name" type="text" value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input" placeholder="Rozvoz Praha - Brno" required />
              </div>
              <div>
                <label htmlFor="date" className="label">Datum jízdy *</label>
                <input id="date" type="date" value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="input" required />
              </div>

              {/* Čas doručení */}
              <div>
                <label className="label">Přibližný čas doručení</label>
                <div className="flex items-center gap-2">
                  <select
                    value={formData.arrivalFrom}
                    onChange={(e) => {
                      const from = e.target.value;
                      // Automaticky přednastavit "do" o 1 hodinu
                      let autoTo = '';
                      if (from) {
                        const [h, m] = from.split(':').map(Number);
                        const toH = h + 1;
                        if (toH <= 23) {
                          autoTo = `${String(toH).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                        }
                      }
                      setFormData({ ...formData, arrivalFrom: from, arrivalTo: formData.arrivalTo || autoTo });
                    }}
                    className="input flex-1"
                  >
                    <option value="">Od</option>
                    {Array.from({ length: 30 }, (_, i) => {
                      const h = Math.floor(i / 2) + 5;
                      const m = (i % 2) * 30;
                      const val = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                      return <option key={val} value={val}>{val}</option>;
                    })}
                  </select>
                  <span className="text-gray-400 font-medium">—</span>
                  <select
                    value={formData.arrivalTo}
                    onChange={(e) => setFormData({ ...formData, arrivalTo: e.target.value })}
                    className="input flex-1"
                  >
                    <option value="">Do</option>
                    {formData.arrivalFrom ? (() => {
                      const [fromH, fromM] = formData.arrivalFrom.split(':').map(Number);
                      const options = [];
                      for (let offset = 1; offset <= 8; offset++) {
                        const totalMin = (fromH * 60 + fromM) + offset * 30;
                        const h = Math.floor(totalMin / 60);
                        const m = totalMin % 60;
                        if (h > 23) break;
                        const val = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                        options.push(<option key={val} value={val}>{val}</option>);
                      }
                      return options;
                    })() : (
                      Array.from({ length: 30 }, (_, i) => {
                        const h = Math.floor(i / 2) + 5;
                        const m = (i % 2) * 30;
                        const val = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                        return <option key={val} value={val}>{val}</option>;
                      })
                    )}
                  </select>
                </div>
                {formData.arrivalFrom && formData.arrivalTo && (
                  <p className="text-xs text-gray-500 mt-1">Doručení přibližně {formData.arrivalFrom} - {formData.arrivalTo}</p>
                )}
              </div>

              {/* Výběr řidiče */}
              <div className="md:col-span-2">
                <label className="label">
                  Řidič {formData.date && <span className="text-gray-500 font-normal">(dle dostupnosti pro {format(new Date(formData.date), 'd.M.yyyy')})</span>}
                </label>
                {!formData.date ? (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-700 text-sm">
                    Nejprve vyberte datum jízdy pro zobrazení dostupnosti řidičů.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    <button type="button" onClick={() => setFormData({ ...formData, driverId: '' })}
                      className={cn('p-3 rounded-lg border-2 text-left transition-all',
                        formData.driverId === '' ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300')}>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">?</div>
                        <div>
                          <div className="font-medium text-gray-700">Nepřiřazeno</div>
                          <div className="text-sm text-gray-500">Vybrat později</div>
                        </div>
                      </div>
                    </button>
                    {getSortedDrivers().map((driver) => {
                      const driverAvail = getDriverAvailability(driver.id, formData.date);
                      const availInfo = driverAvail
                        ? availabilityColors[driverAvail.status]
                        : { bg: 'bg-gray-100', text: 'text-gray-500', label: 'Nevyplněno' };
                      return (
                        <button key={driver.id} type="button"
                          onClick={() => setFormData({ ...formData, driverId: driver.id })}
                          className={cn('p-3 rounded-lg border-2 text-left transition-all',
                            formData.driverId === driver.id ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300',
                            driverAvail?.status === 'UNAVAILABLE' && 'opacity-60')}>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
                              style={{ backgroundColor: driver.color || '#9CA3AF' }}>
                              {driver.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-gray-900">{driver.name}</div>
                              <div className={cn('text-sm font-medium', availInfo.text)}>
                                {availInfo.label}
                                {driverAvail?.note && <span className="font-normal text-gray-500 ml-1">- {driverAvail.note}</span>}
                              </div>
                            </div>
                            <div className={cn('w-4 h-4 rounded-full flex-shrink-0',
                              driverAvail?.status === 'AVAILABLE' && 'bg-green-500',
                              driverAvail?.status === 'PARTIAL' && 'bg-orange-500',
                              driverAvail?.status === 'UNAVAILABLE' && 'bg-red-500',
                              !driverAvail && 'bg-gray-300')} />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="vehicleId" className="label">Vozidlo</label>
                <select id="vehicleId" value={formData.vehicleId}
                  onChange={(e) => setFormData({ ...formData, vehicleId: e.target.value })} className="input">
                  <option value="">-- Vyberte vozidlo --</option>
                  {vehicles.map((v) => <option key={v.id} value={v.id}>{v.name} ({v.spz})</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="plannedKm" className="label">Plánované km</label>
                <input id="plannedKm" type="number" value={formData.plannedKm}
                  onChange={(e) => setFormData({ ...formData, plannedKm: e.target.value })}
                  className="input" placeholder="250" />
              </div>
              <div>
                <label htmlFor="mapUrl" className="label">Odkaz na mapy.cz</label>
                <input id="mapUrl" type="url" value={formData.mapUrl}
                  onChange={(e) => setFormData({ ...formData, mapUrl: e.target.value })}
                  className="input" placeholder="https://mapy.cz/..." />
              </div>
              <div>
                <label htmlFor="complaintCount" className="label">Reklamace</label>
                <input id="complaintCount" type="number" value={formData.complaintCount}
                  onChange={(e) => setFormData({ ...formData, complaintCount: e.target.value })}
                  className="input" placeholder="0" min="0" />
              </div>
              {editingRoute && (
                <div>
                  <label htmlFor="status" className="label">Stav</label>
                  <select id="status" value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="input">
                    <option value="PLANNED">Naplánováno</option>
                    <option value="IN_PROGRESS">Probíhá</option>
                    <option value="COMPLETED">Dokončeno</option>
                  </select>
                </div>
              )}
            </div>

            {/* Objednávky */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900">Objednávky</h3>
                <button type="button" onClick={addOrderRow}
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium">+ Přidat řádek</button>
              </div>
              {/* Desktop */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-2 font-medium text-gray-600">Číslo obj.</th>
                      <th className="text-left py-2 px-2 font-medium text-gray-600">Cena (Kč)</th>
                      <th className="text-left py-2 px-2 font-medium text-gray-600">Čas doručení</th>
                      <th className="text-left py-2 px-2 font-medium text-gray-600">Poznámka</th>
                      <th className="py-2 px-2 w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order, i) => (
                      <tr key={i} className="border-b border-gray-100">
                        <td className="py-1.5 px-2"><input type="text" value={order.orderNumber} onChange={(e) => updateOrder(i, 'orderNumber', e.target.value)} className="input text-sm py-1.5" placeholder="OBJ-001" /></td>
                        <td className="py-1.5 px-2"><input type="number" value={order.price} onChange={(e) => updateOrder(i, 'price', e.target.value)} className="input text-sm py-1.5" placeholder="0" min="0" step="0.01" /></td>
                        <td className="py-1.5 px-2"><input type="text" value={order.deliveryTime} onChange={(e) => updateOrder(i, 'deliveryTime', e.target.value)} className="input text-sm py-1.5" placeholder="10:00" /></td>
                        <td className="py-1.5 px-2"><input type="text" value={order.note} onChange={(e) => updateOrder(i, 'note', e.target.value)} className="input text-sm py-1.5" placeholder="Poznámka" /></td>
                        <td className="py-1.5 px-2">
                          <button type="button" onClick={() => removeOrderRow(i)} className="p-1 text-gray-400 hover:text-red-500 transition-colors" title="Odebrat">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Mobile */}
              <div className="sm:hidden space-y-3">
                {orders.map((order, i) => (
                  <div key={i} className="bg-gray-50 rounded-lg p-3 relative">
                    <button type="button" onClick={() => removeOrderRow(i)} className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-500" title="Odebrat">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                    <div className="grid grid-cols-2 gap-2">
                      <div><label className="text-xs text-gray-500">Číslo obj.</label><input type="text" value={order.orderNumber} onChange={(e) => updateOrder(i, 'orderNumber', e.target.value)} className="input text-sm py-1.5" placeholder="OBJ-001" /></div>
                      <div><label className="text-xs text-gray-500">Cena (Kč)</label><input type="number" value={order.price} onChange={(e) => updateOrder(i, 'price', e.target.value)} className="input text-sm py-1.5" placeholder="0" min="0" step="0.01" /></div>
                      <div><label className="text-xs text-gray-500">Čas doručení</label><input type="text" value={order.deliveryTime} onChange={(e) => updateOrder(i, 'deliveryTime', e.target.value)} className="input text-sm py-1.5" placeholder="10:00" /></div>
                      <div><label className="text-xs text-gray-500">Poznámka</label><input type="text" value={order.note} onChange={(e) => updateOrder(i, 'note', e.target.value)} className="input text-sm py-1.5" placeholder="Poznámka" /></div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Náklady a zisk */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Výplata řidiče (Kč)</label>
                    <input type="number" value={formData.driverPay}
                      onChange={(e) => setFormData({ ...formData, driverPay: e.target.value })}
                      className="input text-sm mt-1" placeholder="2500" min="0" step="1" />
                    <p className="text-xs text-gray-400 mt-1">Výchozí: 2 500 Kč</p>
                  </div>
                  <div className="flex flex-col justify-end">
                    <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
                      <div className="flex justify-between text-gray-600">
                        <span>Objednávky:</span>
                        <span className="font-medium">{ordersTotal.toLocaleString('cs-CZ')} Kč</span>
                      </div>
                      <div className="flex justify-between text-gray-600">
                        <span>Výplata:</span>
                        <span className="font-medium text-red-600">-{driverPayNum.toLocaleString('cs-CZ')} Kč</span>
                      </div>
                      <div className="flex justify-between text-gray-500 text-xs">
                        <span>Nafta:</span>
                        <span className="italic">vyplní řidič po jízdě</span>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-gray-300 font-bold">
                        <span>Zisk (bez nafty):</span>
                        <span className={profit >= 0 ? 'text-green-700' : 'text-red-700'}>
                          {profit.toLocaleString('cs-CZ')} Kč
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="note" className="label">Poznámka</label>
              <textarea id="note" value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                className="input min-h-[80px]" placeholder="Poznámky k trase..." />
            </div>
            <div className="flex space-x-3">
              <button type="button" onClick={handleCancel} className="btn-secondary" disabled={isSaving}>Zrušit</button>
              <button type="submit" className="btn-primary" disabled={isSaving}>
                {isSaving ? 'Ukládání...' : editingRoute ? 'Uložit změny' : 'Vytvořit trasu'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ===== ZÁLOŽKY ===== */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('planned')}
          className={cn(
            'px-4 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-2',
            activeTab === 'planned'
              ? 'bg-blue-100 text-blue-800 border-2 border-blue-300'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-2 border-transparent'
          )}
        >
          📋 Plánované
          {plannedCount > 0 && (
            <span className={cn(
              'text-xs px-1.5 py-0.5 rounded-full font-bold',
              activeTab === 'planned' ? 'bg-blue-200 text-blue-800' : 'bg-gray-200 text-gray-700'
            )}>
              {plannedCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('pending')}
          className={cn(
            'px-4 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-2',
            activeTab === 'pending'
              ? 'bg-orange-100 text-orange-800 border-2 border-orange-300'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-2 border-transparent'
          )}
        >
          ⏳ Neukončené
          {pendingCount > 0 && (
            <span className={cn(
              'text-xs px-1.5 py-0.5 rounded-full font-bold',
              activeTab === 'pending' ? 'bg-orange-200 text-orange-800' : 'bg-red-500 text-white'
            )}>
              {pendingCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('completed')}
          className={cn(
            'px-4 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-2',
            activeTab === 'completed'
              ? 'bg-green-100 text-green-800 border-2 border-green-300'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-2 border-transparent'
          )}
        >
          ✅ Hotové
          {completedCount > 0 && (
            <span className={cn(
              'text-xs px-1.5 py-0.5 rounded-full font-bold',
              activeTab === 'completed' ? 'bg-green-200 text-green-800' : 'bg-gray-200 text-gray-700'
            )}>
              {completedCount}
            </span>
          )}
        </button>
      </div>

      {/* ===== TAB: PLÁNOVANÉ ===== */}
      {activeTab === 'planned' && (
        <div>
          {plannedRoutes.length === 0 ? (
            <div className="card py-12 text-center text-gray-500">
              Žádné naplánované trasy
            </div>
          ) : (
            <div className="space-y-4">
              {groupedPlanned.map((group) => {
                const dayOrders = group.routes.reduce((sum, r) =>
                  sum + (r.orders?.reduce((s, o) => s + (parseFloat(o.price?.toString()) || 0), 0) || 0), 0);
                const dayKm = group.routes.reduce((sum, r) => sum + (r.plannedKm || 0), 0);
                const dayPay = group.routes.reduce((sum, r) => sum + (r.driverPay || 0), 0);
                const isOverdue = isPast(startOfDay(group.date)) && !isToday(group.date);
                const isTodayDate = isToday(group.date);

                return (
                  <div key={group.dateStr} className={cn(
                    'rounded-xl border-2 overflow-hidden',
                    isOverdue ? 'border-red-300 bg-red-50/30' :
                    isTodayDate ? 'border-primary-300 bg-primary-50/20' :
                    'border-gray-200 bg-white'
                  )}>
                    {/* Záhlaví dne */}
                    <div className={cn(
                      'px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4',
                      isOverdue ? 'bg-red-100' : isTodayDate ? 'bg-primary-100' : 'bg-gray-50'
                    )}>
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          'text-center min-w-[50px] p-2 rounded-lg',
                          isOverdue ? 'bg-red-200' : isTodayDate ? 'bg-primary-200' : 'bg-white'
                        )}>
                          <div className="text-xl font-bold">{format(group.date, 'd')}</div>
                          <div className="text-[10px] uppercase font-medium">{format(group.date, 'MMM', { locale: cs })}</div>
                        </div>
                        <div>
                          <div className={cn('font-semibold capitalize',
                            isOverdue ? 'text-red-800' : isTodayDate ? 'text-primary-800' : 'text-gray-900'
                          )}>
                            {group.label}
                          </div>
                          <div className="text-sm text-gray-500">
                            {group.routes.length} {group.routes.length === 1 ? 'trasa' : group.routes.length < 5 ? 'trasy' : 'tras'}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 sm:ml-auto text-xs">
                        {dayKm > 0 && (
                          <span className="px-2 py-1 bg-white rounded-md text-gray-600 border border-gray-200">
                            {dayKm} km
                          </span>
                        )}
                        {dayOrders > 0 && (
                          <span className="px-2 py-1 bg-green-100 rounded-md text-green-700 font-medium">
                            {dayOrders.toLocaleString('cs-CZ')} Kč
                          </span>
                        )}
                        {dayPay > 0 && (
                          <span className="px-2 py-1 bg-red-50 rounded-md text-red-600 font-medium">
                            -{dayPay.toLocaleString('cs-CZ')} Kč výplaty
                          </span>
                        )}
                        {dayOrders - dayPay > 0 && (
                          <span className="px-2 py-1 bg-green-50 rounded-md text-green-700 font-bold">
                            = {(dayOrders - dayPay).toLocaleString('cs-CZ')} Kč
                          </span>
                        )}
                        <button
                          onClick={() => handlePrintDay(group.routes, group.label)}
                          className="px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded-md text-gray-600 transition-colors no-print"
                          title="Tisk tohoto dne"
                        >
                          <svg className="w-3.5 h-3.5 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Trasy daného dne */}
                    <div className="divide-y divide-gray-100">
                      {group.routes.map((route) => (
                        <RouteCard key={route.id} route={route} expanded={expandedRoutes.has(route.id)}
                          onToggle={() => toggleRoute(route.id)} onEdit={handleEdit}
                          onDelete={handleDelete} onStatusChange={handleStatusChange} hideDate />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ===== TAB: NEUKONČENÉ ===== */}
      {activeTab === 'pending' && (
        <div>
          {pendingRoutes.length === 0 ? (
            <div className="card py-12 text-center">
              <div className="text-4xl mb-3">🎉</div>
              <p className="text-gray-500 font-medium">Všechny trasy mají vyplněný report</p>
              <p className="text-gray-400 text-sm mt-1">Žádné neukončené trasy</p>
            </div>
          ) : (
            <div>
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-orange-500 text-white rounded-full flex items-center justify-center font-bold text-xl flex-shrink-0">
                    {pendingCount}
                  </div>
                  <div>
                    <div className="font-semibold text-orange-800">
                      {pendingCount === 1
                        ? '1 trasa bez reportu'
                        : pendingCount < 5
                        ? `${pendingCount} trasy bez reportu`
                        : `${pendingCount} tras bez reportu`}
                    </div>
                    <div className="text-sm text-orange-600">
                      Řidiči musí vyplnit denní report po jízdě
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {pendingRoutes.map((route) => (
                  <RouteCard key={route.id} route={route} expanded={expandedRoutes.has(route.id)}
                    onToggle={() => toggleRoute(route.id)} onEdit={handleEdit}
                    onDelete={handleDelete} onStatusChange={handleStatusChange}
                    showPendingBadge />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== TAB: HOTOVÉ ===== */}
      {activeTab === 'completed' && (
        <div>
          {/* Filtry */}
          <div className="card mb-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Měsíc</label>
                <select
                  value={filterMonth}
                  onChange={(e) => setFilterMonth(e.target.value)}
                  className="input capitalize"
                >
                  {monthOptions.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Řidič</label>
                <select
                  value={filterDriver}
                  onChange={(e) => setFilterDriver(e.target.value)}
                  className="input"
                >
                  <option value="">Všichni řidiči</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Statistiky */}
          {completedCount > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
              <div className="bg-white rounded-lg border p-3 text-center">
                <div className="text-2xl font-bold text-gray-900">{completedStats.count}</div>
                <div className="text-xs text-gray-500">Tras</div>
              </div>
              <div className="bg-white rounded-lg border p-3 text-center">
                <div className="text-2xl font-bold text-gray-700">{completedStats.totalKm.toLocaleString('cs-CZ')}</div>
                <div className="text-xs text-gray-500">Km celkem</div>
              </div>
              <div className="bg-white rounded-lg border p-3 text-center">
                <div className="text-2xl font-bold text-blue-700">{completedStats.totalOrders.toLocaleString('cs-CZ')}</div>
                <div className="text-xs text-gray-500">Tržby (Kč)</div>
              </div>
              <div className="bg-white rounded-lg border p-3 text-center">
                <div className="text-2xl font-bold text-red-600">{(completedStats.totalFuel + completedStats.totalDriverPay).toLocaleString('cs-CZ')}</div>
                <div className="text-xs text-gray-500">Náklady (Kč)</div>
              </div>
              <div className="bg-white rounded-lg border p-3 text-center">
                <div className={cn('text-2xl font-bold', completedStats.totalProfit >= 0 ? 'text-green-700' : 'text-red-700')}>
                  {completedStats.totalProfit.toLocaleString('cs-CZ')}
                </div>
                <div className="text-xs text-gray-500">Zisk (Kč)</div>
              </div>
            </div>
          )}

          {/* Seznam hotových tras */}
          {completedCount === 0 ? (
            <div className="card py-12 text-center text-gray-500">
              Žádné hotové trasy pro vybraný měsíc
            </div>
          ) : (
            <div className="space-y-3">
              {completedRoutes.map((route) => (
                <RouteCard key={route.id} route={route} expanded={expandedRoutes.has(route.id)}
                  onToggle={() => toggleRoute(route.id)} onEdit={handleEdit}
                  onDelete={handleDelete} onStatusChange={handleStatusChange}
                  showReport />
              ))}
            </div>
          )}
        </div>
      )}

      {routes.length === 0 && !showForm && (
        <div className="card py-12 text-center text-gray-500">Žádné trasy</div>
      )}
      </div>{/* konec no-print wrapper */}

      {/* ===== TISKOVÝ OBSAH (viditelný jen při tisku) ===== */}
      {printRoutes && printRoutes.length > 0 && (
        <div ref={printRef} className="print-only print-area" style={{ display: 'none' }}>
          <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '11pt', color: '#000' }}>
            <h1 style={{ fontSize: '16pt', fontWeight: 'bold', marginBottom: '4px', borderBottom: '2px solid #000', paddingBottom: '8px' }}>
              AZA - {printTitle}
            </h1>
            <p style={{ fontSize: '9pt', color: '#666', marginBottom: '16px' }}>
              Vytisknuto: {format(new Date(), 'd.M.yyyy HH:mm', { locale: cs })}
            </p>

            {/* Seskupit tiskové trasy dle řidiče */}
            {(() => {
              const driverMap = new Map<string, Route[]>();
              printRoutes.forEach((r) => {
                const key = r.driver?.name || 'Nepřiřazeno';
                if (!driverMap.has(key)) driverMap.set(key, []);
                driverMap.get(key)!.push(r);
              });

              return Array.from(driverMap.entries()).map(([driverName, driverRoutes], driverIdx) => (
                <div key={driverName} style={{ marginBottom: '24px' }} className={driverIdx > 0 ? 'print-page-break' : ''}>
                  <h2 style={{ fontSize: '14pt', fontWeight: 'bold', marginBottom: '12px', backgroundColor: '#f0f0f0', padding: '6px 10px', borderRadius: '4px' }}>
                    {driverName}
                  </h2>

                  {driverRoutes.map((route, routeIdx) => (
                    <div key={route.id} className="print-no-break" style={{
                      marginBottom: '16px',
                      border: '1px solid #ccc',
                      borderRadius: '6px',
                      padding: '12px',
                      pageBreakInside: 'avoid',
                    }}>
                      {/* Záhlaví trasy */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px', borderBottom: '1px solid #ddd', paddingBottom: '6px' }}>
                        <div>
                          <div style={{ fontSize: '13pt', fontWeight: 'bold' }}>
                            {route.name}
                          </div>
                          <div style={{ fontSize: '10pt', color: '#555' }}>
                            {format(new Date(route.date), 'EEEE d. MMMM yyyy', { locale: cs })}
                            {route.arrivalFrom && (
                              <span style={{ marginLeft: '10px', fontWeight: 'bold', color: '#000' }}>
                                Doručení: {route.arrivalFrom}{route.arrivalTo ? ` - ${route.arrivalTo}` : ''}
                              </span>
                            )}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', fontSize: '10pt' }}>
                          {route.vehicle && (
                            <div style={{ fontWeight: 'bold' }}>{route.vehicle.name} ({route.vehicle.spz})</div>
                          )}
                          {route.plannedKm && <div>{route.plannedKm} km</div>}
                        </div>
                      </div>

                      {/* Poznámka */}
                      {route.note && (
                        <div style={{ backgroundColor: '#fff3cd', padding: '6px 10px', borderRadius: '4px', marginBottom: '8px', fontSize: '10pt' }}>
                          <strong>Poznámka:</strong> {route.note}
                        </div>
                      )}

                      {/* Mapa link */}
                      {route.mapUrl && (
                        <div style={{ marginBottom: '8px', fontSize: '10pt' }}>
                          <strong>Mapa:</strong> {route.mapUrl}
                        </div>
                      )}

                      {/* Objednávky jako tabulka */}
                      {route.orders && route.orders.length > 0 && (
                        <table className="print-table" style={{ width: '100%', borderCollapse: 'collapse', marginTop: '4px' }}>
                          <thead>
                            <tr>
                              <th style={{ border: '1px solid #333', padding: '4px 8px', backgroundColor: '#eee', fontWeight: 'bold', fontSize: '10pt', textAlign: 'left' }}>Obj.</th>
                              <th style={{ border: '1px solid #333', padding: '4px 8px', backgroundColor: '#eee', fontWeight: 'bold', fontSize: '10pt', textAlign: 'left' }}>Čas</th>
                              <th style={{ border: '1px solid #333', padding: '4px 8px', backgroundColor: '#eee', fontWeight: 'bold', fontSize: '10pt', textAlign: 'left' }}>Poznámka</th>
                              <th style={{ border: '1px solid #333', padding: '4px 8px', backgroundColor: '#eee', fontWeight: 'bold', fontSize: '10pt', textAlign: 'right' }}>Cena</th>
                            </tr>
                          </thead>
                          <tbody>
                            {route.orders.map((order, i) => (
                              <tr key={order.id || i}>
                                <td style={{ border: '1px solid #333', padding: '4px 8px', fontSize: '10pt', fontFamily: 'monospace' }}>{order.orderNumber}</td>
                                <td style={{ border: '1px solid #333', padding: '4px 8px', fontSize: '10pt' }}>{order.deliveryTime || '-'}</td>
                                <td style={{ border: '1px solid #333', padding: '4px 8px', fontSize: '10pt' }}>{order.note || '-'}</td>
                                <td style={{ border: '1px solid #333', padding: '4px 8px', fontSize: '10pt', textAlign: 'right', fontWeight: 'bold' }}>
                                  {parseFloat(order.price?.toString() || '0').toLocaleString('cs-CZ')} Kč
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}

                      {/* Podpis řidiče */}
                      <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', fontSize: '9pt', color: '#888' }}>
                        <div>
                          Skutečné km: ___________
                        </div>
                        <div>
                          Nafta (Kč): ___________
                        </div>
                        <div>
                          Podpis řidiče: ___________________
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ));
            })()}
          </div>
        </div>
      )}

      {/* ===== MODAL DOKONČENÍ ===== */}
      {completeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Dokončit jízdu</h3>
            <p className="text-gray-600 mb-4">
              <strong>{completeModal.name}</strong>
              {completeModal.vehicle && <span className="text-gray-500"> - {completeModal.vehicle.name}</span>}
            </p>
            <div className="mb-4">
              <label className="label">Skutečně ujeté km</label>
              <input type="number" value={actualKmInput} onChange={(e) => setActualKmInput(e.target.value)}
                className="input w-full" placeholder={completeModal.plannedKm?.toString() || '0'} min="0" autoFocus />
              {completeModal.plannedKm && <p className="text-sm text-gray-500 mt-1">Plánováno: {completeModal.plannedKm} km</p>}
            </div>
            {completeModal.vehicle && (
              <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-700 mb-4">
                Po dokončení se {actualKmInput || completeModal.plannedKm || 0} km připíše k vozidlu {completeModal.vehicle.name}.
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={() => { setCompleteModal(null); setActualKmInput(''); }} className="btn-secondary flex-1">Zrušit</button>
              <button onClick={handleCompleteRoute} className="btn-primary flex-1">Dokončit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ===== ROUTE CARD =====
function RouteCard({
  route, expanded, onToggle, onEdit, onDelete, onStatusChange, hideDate, showPendingBadge, showReport,
}: {
  route: Route;
  expanded: boolean;
  onToggle: () => void;
  onEdit: (route: Route) => void;
  onDelete: (id: string) => void;
  onStatusChange: (route: Route, status: string) => void;
  hideDate?: boolean;
  showPendingBadge?: boolean;
  showReport?: boolean;
}) {
  const ordersTotal = route.orders?.reduce((sum, o) => sum + (parseFloat(o.price?.toString()) || 0), 0) || 0;
  const reportFuel = route.dailyReport?.fuelCost || 0;
  const totalCosts = (route.driverPay || 0) + (reportFuel > 0 ? reportFuel : (route.fuelCost || 0));
  const netProfit = ordersTotal - totalCosts;
  const hasOrders = route.orders && route.orders.length > 0;
  const report = route.dailyReport;

  return (
    <div className={cn(
      'p-3 sm:p-4 bg-white hover:bg-gray-50/50 transition-colors rounded-lg border border-gray-100',
      showPendingBadge && 'border-l-4 border-l-orange-400 bg-orange-50/20',
      showReport && report?.carCheck === 'NOK' && 'border-l-4 border-l-red-400',
      showReport && report?.carCheck === 'OK' && 'border-l-4 border-l-green-400',
    )}>
      {/* Hlavní řádek */}
      <div className="flex items-start gap-3">
        {/* Datum */}
        {!hideDate && (
          <div className="text-center min-w-[45px]">
            <div className="text-xl font-bold text-gray-900">{format(new Date(route.date), 'd')}</div>
            <div className="text-xs text-gray-500 uppercase">{format(new Date(route.date), 'MMM', { locale: cs })}</div>
          </div>
        )}

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-gray-900 truncate">{route.name}</span>
            {route.status === 'IN_PROGRESS' && (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700">Probíhá</span>
            )}
            {showPendingBadge && (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-700">Bez reportu</span>
            )}
            {showReport && report && (
              <span className={cn(
                'px-2 py-0.5 rounded-full text-xs font-bold',
                report.carCheck === 'OK' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              )}>
                {report.carCheck}
              </span>
            )}
            {route.note && (
              <span className="flex-shrink-0 w-4 h-4 text-gray-400" title={route.note}>
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500 mt-1">
            {route.driver ? (
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: route.driver.color || '#9CA3AF' }} />
                {route.driver.name}
              </span>
            ) : (
              <span className="text-orange-600 font-medium">⚠ Nepřiřazen</span>
            )}
            {route.arrivalFrom && (
              <span className="text-primary-600 font-medium">
                📦 {route.arrivalFrom}{route.arrivalTo ? ` - ${route.arrivalTo}` : ''}
              </span>
            )}
            {route.vehicle && <span>{route.vehicle.name} · {route.vehicle.spz}</span>}
            {(route.actualKm || route.plannedKm) && (
              <span>
                {route.actualKm || route.plannedKm} km
                {report && route.plannedKm && report.actualKm !== route.plannedKm && (
                  <span className="text-gray-400 ml-1">(plán: {route.plannedKm})</span>
                )}
              </span>
            )}
            {route.complaintCount > 0 && (
              <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded-full">
                {route.complaintCount} rekl.
              </span>
            )}
          </div>

          {/* Finanční řádek */}
          {(ordersTotal > 0 || route.driverPay > 0) && (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs mt-2">
              {hasOrders && (
                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded font-medium">
                  {route.orders!.length} obj. · {ordersTotal.toLocaleString('cs-CZ')} Kč
                </span>
              )}
              {route.driverPay > 0 && (
                <span className="px-2 py-0.5 bg-red-50 text-red-600 rounded">
                  -{route.driverPay.toLocaleString('cs-CZ')} Kč
                </span>
              )}
              {reportFuel > 0 && (
                <span className="px-2 py-0.5 bg-orange-50 text-orange-600 rounded">
                  Nafta: -{reportFuel.toLocaleString('cs-CZ')} Kč
                </span>
              )}
              <span className={cn('px-2 py-0.5 rounded font-bold',
                netProfit >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700')}>
                = {netProfit.toLocaleString('cs-CZ')} Kč
              </span>
            </div>
          )}
        </div>

        {/* Akce */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {route.status === 'PLANNED' && (
            <button onClick={() => onStatusChange(route, 'IN_PROGRESS')}
              className="px-2.5 py-1.5 bg-yellow-100 text-yellow-700 rounded-lg text-xs font-medium hover:bg-yellow-200 transition-colors">
              Zahájit
            </button>
          )}
          {route.status === 'IN_PROGRESS' && (
            <button onClick={() => onStatusChange(route, 'COMPLETED')}
              className="px-2.5 py-1.5 bg-green-100 text-green-700 rounded-lg text-xs font-medium hover:bg-green-200 transition-colors">
              Dokončit
            </button>
          )}

          {/* Rozbalit detaily */}
          {(hasOrders || route.mapUrl || route.note || report) && (
            <button onClick={onToggle}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors" title="Detaily">
              <svg className={cn('w-4 h-4 transition-transform', expanded && 'rotate-180')} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          )}

          <button onClick={() => onEdit(route)}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors" title="Upravit">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
          <button onClick={() => onDelete(route.id)}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Smazat">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Rozbalený detail */}
      {expanded && (
        <div className={cn('mt-3 pt-3 border-t border-gray-100 space-y-3', hideDate ? 'ml-0' : 'ml-12')}>
          {/* Mapa */}
          {route.mapUrl && (
            <a href={route.mapUrl} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-primary-600 hover:underline">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Otevřít mapu
            </a>
          )}

          {/* Poznámka */}
          {route.note && (
            <div className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
              <span className="font-medium text-gray-700">Poznámka: </span>{route.note}
            </div>
          )}

          {/* Report */}
          {report && (
            <div className={cn('text-sm rounded-lg p-3',
              report.carCheck === 'OK' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200')}>
              <div className="flex items-center gap-2 mb-1">
                <span className={cn('px-2 py-0.5 rounded-full text-xs font-bold',
                  report.carCheck === 'OK' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')}>
                  {report.carCheck}
                </span>
                <span className="text-gray-600">Report od řidiče</span>
              </div>
              <div className="text-gray-600">
                Skutečné km: <strong>{report.actualKm}</strong>
                {report.fuelCost > 0 && <span className="ml-3">Nafta: <strong>{report.fuelCost.toLocaleString('cs-CZ')} Kč</strong></span>}
              </div>
              {report.carCheckNote && <p className="text-red-600 mt-1">{report.carCheckNote}</p>}
              {report.createdAt && (
                <div className="text-xs text-gray-400 mt-1">
                  Odesláno: {format(new Date(report.createdAt), 'd.M.yyyy HH:mm', { locale: cs })}
                </div>
              )}
            </div>
          )}

          {/* Finanční souhrn v detailu */}
          {(ordersTotal > 0 || route.driverPay > 0 || reportFuel > 0) && (
            <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1.5">
              <div className="text-xs font-medium text-gray-500 uppercase mb-2">Finanční souhrn</div>
              <div className="flex justify-between">
                <span className="text-gray-500">Objednávky:</span>
                <span className="font-medium text-blue-700">{ordersTotal.toLocaleString('cs-CZ')} Kč</span>
              </div>
              {route.driverPay > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Výplata řidiče:</span>
                  <span className="font-medium text-red-600">-{route.driverPay.toLocaleString('cs-CZ')} Kč</span>
                </div>
              )}
              {reportFuel > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Nafta:</span>
                  <span className="font-medium text-red-600">-{reportFuel.toLocaleString('cs-CZ')} Kč</span>
                </div>
              )}
              <div className="flex justify-between pt-1.5 border-t border-gray-300 font-bold">
                <span>Zisk:</span>
                <span className={netProfit >= 0 ? 'text-green-700' : 'text-red-700'}>
                  {netProfit.toLocaleString('cs-CZ')} Kč
                </span>
              </div>
            </div>
          )}

          {/* Objednávky */}
          {hasOrders && (
            <div>
              <div className="text-xs font-medium text-gray-500 uppercase mb-2">
                Objednávky ({route.orders!.length})
              </div>
              <div className="space-y-1.5">
                {route.orders!.map((order, i) => (
                  <div key={order.id || i} className="flex items-center justify-between text-sm bg-gray-50 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-medium text-gray-800">{order.orderNumber}</span>
                      {order.deliveryTime && <span className="text-xs text-gray-400">{order.deliveryTime}</span>}
                      {order.note && <span className="text-xs text-gray-400">{order.note}</span>}
                    </div>
                    <span className="font-medium text-gray-900">
                      {parseFloat(order.price?.toString() || '0').toLocaleString('cs-CZ')} Kč
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
