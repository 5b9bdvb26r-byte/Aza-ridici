'use client';

import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, addMonths } from 'date-fns';
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

interface Route {
  id: string;
  name: string;
  mapUrl: string | null;
  plannedKm: number | null;
  actualKm: number | null;
  date: string;
  note: string | null;
  status: string;
  confirmed: boolean;
  complaintCount: number;
  fuelCost: number;
  driverPay: number;
  driver: Driver | null;
  vehicle: Vehicle | null;
  orders?: Order[];
}

interface Availability {
  userId: string;
  date: string;
  status: 'AVAILABLE' | 'UNAVAILABLE' | 'PARTIAL';
  note?: string;
}

const statusLabels: Record<string, string> = {
  PLANNED: 'Naplánováno',
  IN_PROGRESS: 'Probíhá',
  COMPLETED: 'Dokončeno',
};

const statusColors: Record<string, string> = {
  PLANNED: 'bg-blue-100 text-blue-800',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
  COMPLETED: 'bg-green-100 text-green-800',
};

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
  const [formData, setFormData] = useState({
    name: '',
    mapUrl: '',
    plannedKm: '',
    actualKm: '',
    date: '',
    driverId: '',
    vehicleId: '',
    note: '',
    status: 'PLANNED',
    complaintCount: '0',
    fuelCost: '',
    driverPay: '',
  });
  const [orders, setOrders] = useState<Order[]>([emptyOrder()]);
  const [isSaving, setIsSaving] = useState(false);

  // Modal pro dokončení jízdy
  const [completeModal, setCompleteModal] = useState<Route | null>(null);
  const [actualKmInput, setActualKmInput] = useState('');

  useEffect(() => {
    Promise.all([fetchRoutes(), fetchDrivers(), fetchVehicles(), fetchAvailability()]).then(() => {
      setIsLoading(false);
    });
  }, []);

  // Refetch dostupnosti při změně data
  useEffect(() => {
    if (formData.date) {
      fetchAvailabilityForDate(formData.date);
    }
  }, [formData.date]);

  const fetchRoutes = async () => {
    try {
      const response = await fetch('/api/routes');
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
  const addOrderRow = () => {
    setOrders([...orders, emptyOrder()]);
  };

  const removeOrderRow = (index: number) => {
    if (orders.length === 1) {
      setOrders([emptyOrder()]);
      return;
    }
    setOrders(orders.filter((_, i) => i !== index));
  };

  const updateOrder = (index: number, field: keyof Order, value: string) => {
    const newOrders = [...orders];
    newOrders[index] = { ...newOrders[index], [field]: value };
    setOrders(newOrders);
  };

  // Výpočty
  const ordersTotal = orders.reduce((sum, o) => sum + (parseFloat(o.price) || 0), 0);
  const fuelCostNum = parseFloat(formData.fuelCost) || 0;
  const driverPayNum = parseFloat(formData.driverPay) || 0;
  const profit = ordersTotal - fuelCostNum - driverPayNum;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const url = editingRoute
        ? `/api/routes/${editingRoute.id}`
        : '/api/routes';
      const method = editingRoute ? 'PUT' : 'POST';

      // Filtrovat prázdné objednávky
      const validOrders = orders.filter((o) => o.orderNumber.trim() !== '');

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          orders: validOrders,
        }),
      });

      if (response.ok) {
        await fetchRoutes();
        handleCancel();
      }
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
      driverId: route.driver?.id || '',
      vehicleId: route.vehicle?.id || '',
      note: route.note || '',
      status: route.status,
      complaintCount: route.complaintCount?.toString() || '0',
      fuelCost: route.fuelCost ? route.fuelCost.toString() : '',
      driverPay: route.driverPay ? route.driverPay.toString() : '',
    });
    // Načíst objednávky
    if (route.orders && route.orders.length > 0) {
      setOrders(
        route.orders.map((o) => ({
          id: o.id,
          orderNumber: o.orderNumber,
          price: o.price?.toString() || '',
          deliveryTime: o.deliveryTime || '',
          note: o.note || '',
        }))
      );
    } else {
      setOrders([emptyOrder()]);
    }
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Opravdu chcete smazat tuto trasu?')) return;

    try {
      const response = await fetch(`/api/routes/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchRoutes();
      }
    } catch (error) {
      console.error('Chyba při mazání trasy:', error);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingRoute(null);
    setFormData({
      name: '',
      mapUrl: '',
      plannedKm: '',
      actualKm: '',
      date: '',
      driverId: '',
      vehicleId: '',
      note: '',
      status: 'PLANNED',
      complaintCount: '0',
      fuelCost: '',
      driverPay: '',
    });
    setOrders([emptyOrder()]);
  };

  // Změna stavu trasy
  const handleStatusChange = async (route: Route, newStatus: string) => {
    // Pokud se mění na COMPLETED, otevřít modal pro zadání skutečných km
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
          ...route,
          date: route.date.split('T')[0],
          driverId: route.driver?.id || '',
          vehicleId: route.vehicle?.id || '',
          status: newStatus,
        }),
      });

      if (response.ok) {
        await fetchRoutes();
      }
    } catch (error) {
      console.error('Chyba při změně stavu:', error);
    }
  };

  // Dokončení jízdy s km
  const handleCompleteRoute = async () => {
    if (!completeModal) return;

    try {
      const response = await fetch(`/api/routes/${completeModal.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...completeModal,
          date: completeModal.date.split('T')[0],
          driverId: completeModal.driver?.id || '',
          vehicleId: completeModal.vehicle?.id || '',
          actualKm: actualKmInput,
          status: 'COMPLETED',
        }),
      });

      if (response.ok) {
        await fetchRoutes();
        setCompleteModal(null);
        setActualKmInput('');
      }
    } catch (error) {
      console.error('Chyba při dokončování trasy:', error);
    }
  };

  // Seřadit řidiče podle dostupnosti pro vybraný den
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

  // Rozdělit trasy podle stavu
  const plannedRoutes = routes.filter((r) => r.status === 'PLANNED');
  const inProgressRoutes = routes.filter((r) => r.status === 'IN_PROGRESS');
  const completedRoutes = routes.filter((r) => r.status === 'COMPLETED');

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
          <h1 className="text-2xl font-bold text-gray-900">Trasy</h1>
          <p className="text-gray-600 mt-1">Přehled a správa tras</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          + Nová trasa
        </button>
      </div>

      {showForm && (
        <div className="card mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {editingRoute ? 'Upravit trasu' : 'Nová trasa'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="name" className="label">
                  Název trasy *
                </label>
                <input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="input"
                  placeholder="Rozvoz Praha - Brno"
                  required
                />
              </div>
              <div>
                <label htmlFor="date" className="label">
                  Datum jízdy *
                </label>
                <input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) =>
                    setFormData({ ...formData, date: e.target.value })
                  }
                  className="input"
                  required
                />
              </div>

              {/* Výběr řidiče s dostupností */}
              <div className="md:col-span-2">
                <label className="label">
                  Řidič {formData.date && <span className="text-gray-500 font-normal">(seřazeno dle dostupnosti pro {format(new Date(formData.date), 'd.M.yyyy')})</span>}
                </label>

                {!formData.date ? (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-700 text-sm">
                    Nejprve vyberte datum jízdy pro zobrazení dostupnosti řidičů.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, driverId: '' })}
                      className={cn(
                        'p-3 rounded-lg border-2 text-left transition-all',
                        formData.driverId === ''
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
                          ?
                        </div>
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
                        <button
                          key={driver.id}
                          type="button"
                          onClick={() => setFormData({ ...formData, driverId: driver.id })}
                          className={cn(
                            'p-3 rounded-lg border-2 text-left transition-all',
                            formData.driverId === driver.id
                              ? 'border-primary-500 bg-primary-50'
                              : 'border-gray-200 hover:border-gray-300',
                            driverAvail?.status === 'UNAVAILABLE' && 'opacity-60'
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
                              style={{ backgroundColor: driver.color || '#9CA3AF' }}
                            >
                              {driver.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-gray-900">{driver.name}</div>
                              <div className={cn('text-sm font-medium', availInfo.text)}>
                                {availInfo.label}
                                {driverAvail?.note && (
                                  <span className="font-normal text-gray-500 ml-1">
                                    - {driverAvail.note}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div
                              className={cn(
                                'w-4 h-4 rounded-full flex-shrink-0',
                                driverAvail?.status === 'AVAILABLE' && 'bg-green-500',
                                driverAvail?.status === 'PARTIAL' && 'bg-orange-500',
                                driverAvail?.status === 'UNAVAILABLE' && 'bg-red-500',
                                !driverAvail && 'bg-gray-300'
                              )}
                            />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="vehicleId" className="label">
                  Vozidlo
                </label>
                <select
                  id="vehicleId"
                  value={formData.vehicleId}
                  onChange={(e) =>
                    setFormData({ ...formData, vehicleId: e.target.value })
                  }
                  className="input"
                >
                  <option value="">-- Vyberte vozidlo --</option>
                  {vehicles.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.name} ({vehicle.spz})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="plannedKm" className="label">
                  Plánované km
                </label>
                <input
                  id="plannedKm"
                  type="number"
                  value={formData.plannedKm}
                  onChange={(e) =>
                    setFormData({ ...formData, plannedKm: e.target.value })
                  }
                  className="input"
                  placeholder="250"
                />
              </div>
              <div>
                <label htmlFor="mapUrl" className="label">
                  Odkaz na mapy.cz
                </label>
                <input
                  id="mapUrl"
                  type="url"
                  value={formData.mapUrl}
                  onChange={(e) =>
                    setFormData({ ...formData, mapUrl: e.target.value })
                  }
                  className="input"
                  placeholder="https://mapy.cz/..."
                />
              </div>
              <div>
                <label htmlFor="complaintCount" className="label">
                  Reklamace
                </label>
                <input
                  id="complaintCount"
                  type="number"
                  value={formData.complaintCount}
                  onChange={(e) =>
                    setFormData({ ...formData, complaintCount: e.target.value })
                  }
                  className="input"
                  placeholder="0"
                  min="0"
                />
              </div>
              {editingRoute && (
                <div>
                  <label htmlFor="status" className="label">
                    Stav
                  </label>
                  <select
                    id="status"
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value })
                    }
                    className="input"
                  >
                    <option value="PLANNED">Naplánováno</option>
                    <option value="IN_PROGRESS">Probíhá</option>
                    <option value="COMPLETED">Dokončeno</option>
                  </select>
                </div>
              )}
            </div>

            {/* Tabulka objednávek */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900">Objednávky</h3>
                <button
                  type="button"
                  onClick={addOrderRow}
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  + Přidat řádek
                </button>
              </div>

              {/* Desktop tabulka */}
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
                    {orders.map((order, index) => (
                      <tr key={index} className="border-b border-gray-100">
                        <td className="py-1.5 px-2">
                          <input
                            type="text"
                            value={order.orderNumber}
                            onChange={(e) => updateOrder(index, 'orderNumber', e.target.value)}
                            className="input text-sm py-1.5"
                            placeholder="OBJ-001"
                          />
                        </td>
                        <td className="py-1.5 px-2">
                          <input
                            type="number"
                            value={order.price}
                            onChange={(e) => updateOrder(index, 'price', e.target.value)}
                            className="input text-sm py-1.5"
                            placeholder="0"
                            min="0"
                            step="0.01"
                          />
                        </td>
                        <td className="py-1.5 px-2">
                          <input
                            type="text"
                            value={order.deliveryTime}
                            onChange={(e) => updateOrder(index, 'deliveryTime', e.target.value)}
                            className="input text-sm py-1.5"
                            placeholder="10:00"
                          />
                        </td>
                        <td className="py-1.5 px-2">
                          <input
                            type="text"
                            value={order.note}
                            onChange={(e) => updateOrder(index, 'note', e.target.value)}
                            className="input text-sm py-1.5"
                            placeholder="Poznámka"
                          />
                        </td>
                        <td className="py-1.5 px-2">
                          <button
                            type="button"
                            onClick={() => removeOrderRow(index)}
                            className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                            title="Odebrat"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile karty */}
              <div className="sm:hidden space-y-3">
                {orders.map((order, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-3 relative">
                    <button
                      type="button"
                      onClick={() => removeOrderRow(index)}
                      className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-500"
                      title="Odebrat"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-gray-500">Číslo obj.</label>
                        <input
                          type="text"
                          value={order.orderNumber}
                          onChange={(e) => updateOrder(index, 'orderNumber', e.target.value)}
                          className="input text-sm py-1.5"
                          placeholder="OBJ-001"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Cena (Kč)</label>
                        <input
                          type="number"
                          value={order.price}
                          onChange={(e) => updateOrder(index, 'price', e.target.value)}
                          className="input text-sm py-1.5"
                          placeholder="0"
                          min="0"
                          step="0.01"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Čas doručení</label>
                        <input
                          type="text"
                          value={order.deliveryTime}
                          onChange={(e) => updateOrder(index, 'deliveryTime', e.target.value)}
                          className="input text-sm py-1.5"
                          placeholder="10:00"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Poznámka</label>
                        <input
                          type="text"
                          value={order.note}
                          onChange={(e) => updateOrder(index, 'note', e.target.value)}
                          className="input text-sm py-1.5"
                          placeholder="Poznámka"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Náklady a zisk */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Nafta (Kč)</label>
                    <input
                      type="number"
                      value={formData.fuelCost}
                      onChange={(e) => setFormData({ ...formData, fuelCost: e.target.value })}
                      className="input text-sm mt-1"
                      placeholder="0"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Výplata řidiče (Kč)</label>
                    <input
                      type="number"
                      value={formData.driverPay}
                      onChange={(e) => setFormData({ ...formData, driverPay: e.target.value })}
                      className="input text-sm mt-1"
                      placeholder="0"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div className="flex flex-col justify-end">
                    <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
                      <div className="flex justify-between text-gray-600">
                        <span>Objednávky:</span>
                        <span className="font-medium">{ordersTotal.toLocaleString('cs-CZ')} Kč</span>
                      </div>
                      <div className="flex justify-between text-gray-600">
                        <span>Nafta:</span>
                        <span className="font-medium text-red-600">-{fuelCostNum.toLocaleString('cs-CZ')} Kč</span>
                      </div>
                      <div className="flex justify-between text-gray-600">
                        <span>Výplata:</span>
                        <span className="font-medium text-red-600">-{driverPayNum.toLocaleString('cs-CZ')} Kč</span>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-gray-300 font-bold">
                        <span>Zisk:</span>
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
              <label htmlFor="note" className="label">
                Poznámka
              </label>
              <textarea
                id="note"
                value={formData.note}
                onChange={(e) =>
                  setFormData({ ...formData, note: e.target.value })
                }
                className="input min-h-[80px]"
                placeholder="Poznámky k trase..."
              />
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
                {isSaving
                  ? 'Ukládání...'
                  : editingRoute
                  ? 'Uložit změny'
                  : 'Vytvořit trasu'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Sekce tras podle stavu */}
      <div className="space-y-6">
        {/* Probíhající */}
        {inProgressRoutes.length > 0 && (
          <div className="card border-2 border-yellow-200 bg-yellow-50/30">
            <h2 className="text-lg font-semibold text-yellow-800 mb-4 flex items-center gap-2">
              Probíhající jízdy ({inProgressRoutes.length})
            </h2>
            <div className="space-y-3">
              {inProgressRoutes.map((route) => (
                <RouteCard
                  key={route.id}
                  route={route}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onStatusChange={handleStatusChange}
                />
              ))}
            </div>
          </div>
        )}

        {/* Naplánované */}
        {plannedRoutes.length > 0 && (
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              Naplánované ({plannedRoutes.length})
            </h2>
            <div className="space-y-3">
              {plannedRoutes.map((route) => (
                <RouteCard
                  key={route.id}
                  route={route}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onStatusChange={handleStatusChange}
                />
              ))}
            </div>
          </div>
        )}

        {/* Dokončené */}
        {completedRoutes.length > 0 && (
          <div className="card bg-gray-50">
            <h2 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
              Dokončené ({completedRoutes.length})
            </h2>
            <div className="space-y-3">
              {completedRoutes.map((route) => (
                <RouteCard
                  key={route.id}
                  route={route}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onStatusChange={handleStatusChange}
                />
              ))}
            </div>
          </div>
        )}

        {routes.length === 0 && (
          <div className="card py-12 text-center text-gray-500">
            Žádné trasy
          </div>
        )}
      </div>

      {/* Modal pro dokončení jízdy */}
      {completeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Dokončit jízdu
            </h3>
            <p className="text-gray-600 mb-4">
              <strong>{completeModal.name}</strong>
              {completeModal.vehicle && (
                <span className="text-gray-500"> - {completeModal.vehicle.name}</span>
              )}
            </p>
            <div className="mb-4">
              <label className="label">Skutečně ujeté km</label>
              <input
                type="number"
                value={actualKmInput}
                onChange={(e) => setActualKmInput(e.target.value)}
                className="input w-full"
                placeholder={completeModal.plannedKm?.toString() || '0'}
                min="0"
                autoFocus
              />
              {completeModal.plannedKm && (
                <p className="text-sm text-gray-500 mt-1">
                  Plánováno: {completeModal.plannedKm} km
                </p>
              )}
            </div>
            {completeModal.vehicle && (
              <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-700 mb-4">
                Po dokončení se {actualKmInput || completeModal.plannedKm || 0} km připíše k počítadlu oleje a AdBlue vozidla {completeModal.vehicle.name}.
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setCompleteModal(null);
                  setActualKmInput('');
                }}
                className="btn-secondary flex-1"
              >
                Zrušit
              </button>
              <button
                onClick={handleCompleteRoute}
                className="btn-primary flex-1"
              >
                Dokončit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Komponenta pro zobrazení jedné trasy
function RouteCard({
  route,
  onEdit,
  onDelete,
  onStatusChange,
}: {
  route: Route;
  onEdit: (route: Route) => void;
  onDelete: (id: string) => void;
  onStatusChange: (route: Route, status: string) => void;
}) {
  const ordersTotal = route.orders?.reduce((sum, o) => sum + (parseFloat(o.price?.toString()) || 0), 0) || 0;
  const profit = ordersTotal - (route.fuelCost || 0) - (route.driverPay || 0);
  const hasFinancials = ordersTotal > 0 || route.fuelCost > 0 || route.driverPay > 0;

  return (
    <div className="p-3 sm:p-4 bg-white rounded-lg border border-gray-200">
      <div className="flex items-start gap-3 sm:gap-4">
        {/* Datum */}
        <div className="text-center min-w-[45px] sm:min-w-[60px]">
          <div className="text-xl sm:text-2xl font-bold text-gray-900">
            {format(new Date(route.date), 'd')}
          </div>
          <div className="text-xs text-gray-500 uppercase">
            {format(new Date(route.date), 'MMM', { locale: cs })}
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="font-medium text-gray-900 truncate">{route.name}</div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500 mt-1">
            {route.driver ? (
              <span className="flex items-center gap-1">
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: route.driver.color || '#9CA3AF' }}
                />
                {route.driver.name}
              </span>
            ) : (
              <span className="text-orange-600">Nepřiřazen</span>
            )}
            {route.vehicle && (
              <span>- {route.vehicle.spz}</span>
            )}
            {(route.actualKm || route.plannedKm) && (
              <span>
                - {route.actualKm || route.plannedKm} km
              </span>
            )}
            {route.complaintCount > 0 && (
              <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded-full">
                {route.complaintCount} rekl.
              </span>
            )}
          </div>
          {route.mapUrl && (
            <a
              href={route.mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary-600 hover:underline"
            >
              Mapa
            </a>
          )}

          {/* Finanční souhrn */}
          {hasFinancials && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs mt-2 pt-2 border-t border-gray-100">
              {route.orders && route.orders.length > 0 && (
                <span className="text-gray-500">
                  {route.orders.length} obj. | {ordersTotal.toLocaleString('cs-CZ')} Kč
                </span>
              )}
              {route.fuelCost > 0 && (
                <span className="text-red-600">Nafta: -{route.fuelCost.toLocaleString('cs-CZ')} Kč</span>
              )}
              {route.driverPay > 0 && (
                <span className="text-red-600">Výplata: -{route.driverPay.toLocaleString('cs-CZ')} Kč</span>
              )}
              <span className={cn('font-bold', profit >= 0 ? 'text-green-700' : 'text-red-700')}>
                Zisk: {profit.toLocaleString('cs-CZ')} Kč
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Stav a akce - separate row on mobile */}
      <div className="flex items-center justify-end gap-2 mt-2 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
        {route.status === 'PLANNED' && (
          <button
            onClick={() => onStatusChange(route, 'IN_PROGRESS')}
            className="px-3 py-1.5 bg-yellow-100 text-yellow-700 rounded-lg text-sm font-medium hover:bg-yellow-200 transition-colors"
          >
            Zahájit
          </button>
        )}
        {route.status === 'IN_PROGRESS' && (
          <button
            onClick={() => onStatusChange(route, 'COMPLETED')}
            className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm font-medium hover:bg-green-200 transition-colors"
          >
            Dokončit
          </button>
        )}
        {route.status === 'COMPLETED' && (
          <span className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm font-medium">
            Hotovo
          </span>
        )}
        <button
          onClick={() => onEdit(route)}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          title="Upravit"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>
        <button
          onClick={() => onDelete(route.id)}
          className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          title="Smazat"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
}
