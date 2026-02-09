'use client';

import { useState, useEffect, useCallback } from 'react';

interface Driver {
  id: string;
  name: string;
  email: string;
  color: string | null;
  ratingUp: number;
  ratingDown: number;
}

// Předdefinované barvy pro rychlý výběr
const predefinedColors = [
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#F97316', // orange
];

export default function DriversManagement() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Formulář pro nového řidiče
  const [showAddForm, setShowAddForm] = useState(false);
  const [newDriver, setNewDriver] = useState({
    name: '',
    color: '#3B82F6',
    password: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Editace řidiče
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [editForm, setEditForm] = useState({ name: '', color: '', password: '' });

  // Mazání řidiče
  const [deletingDriver, setDeletingDriver] = useState<Driver | null>(null);

  // Reset hodnocení
  const [resetRatingDriver, setResetRatingDriver] = useState<Driver | null>(null);

  // Hodnocení - loading state pro tlačítka
  const [ratingLoading, setRatingLoading] = useState<string | null>(null);

  const fetchDrivers = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/drivers');
      if (!response.ok) {
        throw new Error('Chyba při načítání řidičů');
      }
      const data = await response.json();
      setDrivers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Neznámá chyba');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDrivers();
  }, [fetchDrivers]);

  const handleAddDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/drivers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newDriver),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Chyba při vytváření řidiče');
      }

      await fetchDrivers();
      setShowAddForm(false);
      setNewDriver({ name: '', color: '#3B82F6', password: '' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Neznámá chyba');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDriver) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const payload: Record<string, string> = {
        name: editForm.name,
        color: editForm.color,
      };
      if (editForm.password) {
        payload.password = editForm.password;
      }

      const response = await fetch(`/api/drivers/${editingDriver.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Chyba při aktualizaci řidiče');
      }

      await fetchDrivers();
      setEditingDriver(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Neznámá chyba');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteDriver = async () => {
    if (!deletingDriver) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/drivers/${deletingDriver.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Chyba při mazání řidiče');
      }

      await fetchDrivers();
      setDeletingDriver(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Neznámá chyba');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRating = async (driverId: string, action: 'up' | 'down') => {
    setRatingLoading(driverId);
    try {
      const response = await fetch(`/api/drivers/${driverId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      if (response.ok) {
        const updated = await response.json();
        setDrivers(prev => prev.map(d =>
          d.id === driverId
            ? { ...d, ratingUp: updated.ratingUp, ratingDown: updated.ratingDown }
            : d
        ));
      }
    } catch (err) {
      console.error('Chyba při úpravě hodnocení:', err);
    } finally {
      setRatingLoading(null);
    }
  };

  const handleResetRating = async () => {
    if (!resetRatingDriver) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/drivers/${resetRatingDriver.id}/reviews`, {
        method: 'DELETE',
      });

      if (response.ok) {
        const updated = await response.json();
        setDrivers(prev => prev.map(d =>
          d.id === resetRatingDriver.id
            ? { ...d, ratingUp: updated.ratingUp, ratingDown: updated.ratingDown }
            : d
        ));
      }

      setResetRatingDriver(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Neznámá chyba');
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEdit = (driver: Driver) => {
    setEditingDriver(driver);
    setEditForm({
      name: driver.name,
      color: driver.color || '#3B82F6',
      password: '',
    });
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
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Správa řidičů</h1>
          <p className="text-gray-600 mt-1">
            Přidávejte, upravujte a mazejte řidiče
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="btn-primary w-full sm:w-auto"
        >
          + Přidat řidiče
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Seznam řidičů */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Řidiči ({drivers.length})
        </h2>

        {drivers.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            Žádní řidiči v systému
          </p>
        ) : (
          <div className="space-y-3">
            {drivers.map((driver) => (
              <div
                key={driver.id}
                className="p-3 sm:p-4 bg-gray-50 rounded-lg"
              >
                {/* Hlavní řádek - info a akce */}
                <div className="flex items-center gap-3 sm:gap-4">
                  <div
                    className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: driver.color || '#9CA3AF' }}
                  >
                    {driver.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 text-lg">{driver.name}</div>
                    <div className="text-sm text-gray-500">
                      Přihlášení: <span className="text-gray-700">{driver.name}</span>
                    </div>
                  </div>
                  {/* Desktop akce */}
                  <div className="hidden sm:flex items-center gap-2">
                    <button
                      onClick={() => startEdit(driver)}
                      className="btn-secondary text-sm"
                    >
                      Upravit
                    </button>
                    <button
                      onClick={() => setDeletingDriver(driver)}
                      className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors"
                    >
                      Smazat
                    </button>
                  </div>
                </div>

                {/* Hodnocení řádek */}
                <div className="mt-3 pt-3 border-t border-gray-200 flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => handleRating(driver.id, 'up')}
                    disabled={ratingLoading === driver.id}
                    className="px-3 py-1.5 flex items-center gap-1 bg-green-100 text-green-700 rounded-lg text-sm font-medium hover:bg-green-200 transition-colors disabled:opacity-50"
                    title="Pozitivní hodnocení"
                  >
                    +
                  </button>
                  <button
                    onClick={() => handleRating(driver.id, 'down')}
                    disabled={ratingLoading === driver.id}
                    className="px-3 py-1.5 flex items-center gap-1 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors disabled:opacity-50"
                    title="Negativní hodnocení"
                  >
                    -
                  </button>

                  <div className="flex items-center gap-3 ml-2">
                    <span className="text-green-600 font-bold text-sm">
                      +{driver.ratingUp}
                    </span>
                    <span className="text-red-600 font-bold text-sm">
                      -{driver.ratingDown}
                    </span>
                  </div>

                  {(driver.ratingUp > 0 || driver.ratingDown > 0) && (
                    <button
                      onClick={() => setResetRatingDriver(driver)}
                      className="ml-auto px-3 py-1.5 bg-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors"
                      title="Reset hodnocení po vyplacení"
                    >
                      Reset
                    </button>
                  )}
                </div>

                {/* Mobilní akce */}
                <div className="mt-3 pt-3 border-t border-gray-200 flex gap-2 sm:hidden">
                  <button
                    onClick={() => startEdit(driver)}
                    className="btn-secondary text-sm flex-1"
                  >
                    Upravit
                  </button>
                  <button
                    onClick={() => setDeletingDriver(driver)}
                    className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors flex-1"
                  >
                    Smazat
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal - přidání řidiče */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white rounded-t-xl sm:rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  Přidat nového řidiče
                </h3>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                >
                  &times;
                </button>
              </div>
            </div>

            <form onSubmit={handleAddDriver} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Jméno řidiče (slouží i pro přihlášení)
                </label>
                <input
                  type="text"
                  required
                  value={newDriver.name}
                  onChange={(e) => setNewDriver({ ...newDriver, name: e.target.value })}
                  className="input"
                  placeholder="např. Petr, Dan, Hára..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Heslo pro přihlášení
                </label>
                <input
                  type="text"
                  required
                  value={newDriver.password}
                  onChange={(e) => setNewDriver({ ...newDriver, password: e.target.value })}
                  className="input"
                  placeholder="Zadejte heslo"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Barva v kalendáři
                </label>
                <div className="flex items-center gap-3">
                  <div className="flex gap-2 flex-wrap">
                    {predefinedColors.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setNewDriver({ ...newDriver, color })}
                        className={`w-8 h-8 rounded-full transition-transform ${
                          newDriver.color === color ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : ''
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  <input
                    type="color"
                    value={newDriver.color}
                    onChange={(e) => setNewDriver({ ...newDriver, color: e.target.value })}
                    className="w-8 h-8 rounded cursor-pointer"
                    title="Vlastní barva"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="btn-secondary flex-1"
                >
                  Zrušit
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary flex-1"
                >
                  {isSubmitting ? 'Ukládám...' : 'Přidat'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal - editace řidiče */}
      {editingDriver && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white rounded-t-xl sm:rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  Upravit řidiče
                </h3>
                <button
                  onClick={() => setEditingDriver(null)}
                  className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                >
                  &times;
                </button>
              </div>
            </div>

            <form onSubmit={handleUpdateDriver} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Jméno řidiče (slouží i pro přihlášení)
                </label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nové heslo
                </label>
                <input
                  type="text"
                  value={editForm.password}
                  onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                  className="input"
                  placeholder="Ponechte prázdné pro zachování stávajícího"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Vyplňte pouze pokud chcete změnit heslo
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Barva v kalendáři
                </label>
                <div className="flex items-center gap-3">
                  <div className="flex gap-2 flex-wrap">
                    {predefinedColors.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setEditForm({ ...editForm, color })}
                        className={`w-8 h-8 rounded-full transition-transform ${
                          editForm.color === color ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : ''
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  <input
                    type="color"
                    value={editForm.color}
                    onChange={(e) => setEditForm({ ...editForm, color: e.target.value })}
                    className="w-8 h-8 rounded cursor-pointer"
                    title="Vlastní barva"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingDriver(null)}
                  className="btn-secondary flex-1"
                >
                  Zrušit
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary flex-1"
                >
                  {isSubmitting ? 'Ukládám...' : 'Uložit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal - potvrzení smazání */}
      {deletingDriver && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white rounded-t-xl sm:rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Smazat řidiče
            </h3>
            <p className="text-gray-600 mb-6">
              Opravdu chcete smazat řidiče <strong>{deletingDriver.name}</strong>?
              Tato akce je nevratná a smaže všechna data spojená s tímto řidičem.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeletingDriver(null)}
                className="btn-secondary flex-1"
              >
                Zrušit
              </button>
              <button
                onClick={handleDeleteDriver}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {isSubmitting ? 'Mazání...' : 'Smazat'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal - potvrzení resetu hodnocení */}
      {resetRatingDriver && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white rounded-t-xl sm:rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Reset hodnocení
            </h3>
            <p className="text-gray-600 mb-2">
              Resetovat hodnocení řidiče <strong>{resetRatingDriver.name}</strong>?
            </p>
            <div className="mb-4 p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
              <div className="flex items-center gap-4 mb-1">
                <span>Aktuální: <span className="text-green-600 font-bold">+{resetRatingDriver.ratingUp}</span> / <span className="text-red-600 font-bold">-{resetRatingDriver.ratingDown}</span></span>
              </div>
              <p className="text-xs text-gray-500">
                Po resetu se obě hodnoty vynulují. Použijte po vyplacení bonusu nebo srážky.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setResetRatingDriver(null)}
                className="btn-secondary flex-1"
              >
                Zrušit
              </button>
              <button
                onClick={handleResetRating}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
              >
                {isSubmitting ? 'Resetuji...' : 'Resetovat'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
