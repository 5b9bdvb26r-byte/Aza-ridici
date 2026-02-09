'use client';

import { useState, useEffect, useCallback } from 'react';

interface Vehicle {
  id: string;
  spz: string;
  name: string;
}

interface Movement {
  id: string;
  type: 'IN' | 'OUT';
  quantity: number;
  note: string | null;
  vehicleId: string | null;
  vehicle: Vehicle | null;
  createdAt: string;
}

interface SparePart {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  minStock: number;
  note: string | null;
  movements: Movement[];
}

export default function SkladPage() {
  const [parts, setParts] = useState<SparePart[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Nový díl
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPart, setNewPart] = useState({ name: '', quantity: 0, unit: 'ks', minStock: 0, note: '' });

  // Editace dílu
  const [editingPart, setEditingPart] = useState<SparePart | null>(null);
  const [editForm, setEditForm] = useState({ name: '', unit: '', minStock: 0, note: '' });

  // Mazání dílu
  const [deletingPart, setDeletingPart] = useState<SparePart | null>(null);

  // Pohyb skladu
  const [movementPart, setMovementPart] = useState<SparePart | null>(null);
  const [movementForm, setMovementForm] = useState({ type: 'IN' as 'IN' | 'OUT', quantity: 1, note: '', vehicleId: '' });

  // Detail / historie
  const [expandedPart, setExpandedPart] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchParts = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/spare-parts');
      if (!response.ok) throw new Error('Chyba při načítání skladu');
      const data = await response.json();
      setParts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Neznámá chyba');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchVehicles = useCallback(async () => {
    try {
      const response = await fetch('/api/vehicles');
      if (response.ok) {
        const data = await response.json();
        setVehicles(data);
      }
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    fetchParts();
    fetchVehicles();
  }, [fetchParts, fetchVehicles]);

  const handleAddPart = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await fetch('/api/spare-parts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPart),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Chyba');
      }
      await fetchParts();
      setShowAddForm(false);
      setNewPart({ name: '', quantity: 0, unit: 'ks', minStock: 0, note: '' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Neznámá chyba');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditPart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPart) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`/api/spare-parts/${editingPart.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Chyba');
      }
      await fetchParts();
      setEditingPart(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Neznámá chyba');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePart = async () => {
    if (!deletingPart) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`/api/spare-parts/${deletingPart.id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Chyba');
      }
      await fetchParts();
      setDeletingPart(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Neznámá chyba');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!movementPart) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`/api/spare-parts/${movementPart.id}/movements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: movementForm.type,
          quantity: movementForm.quantity,
          note: movementForm.note || null,
          vehicleId: movementForm.vehicleId || null,
        }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Chyba');
      }
      await fetchParts();
      setMovementPart(null);
      setMovementForm({ type: 'IN', quantity: 1, note: '', vehicleId: '' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Neznámá chyba');
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEdit = (part: SparePart) => {
    setEditingPart(part);
    setEditForm({ name: part.name, unit: part.unit, minStock: part.minStock, note: part.note || '' });
  };

  const startMovement = (part: SparePart, type: 'IN' | 'OUT') => {
    setMovementPart(part);
    setMovementForm({ type, quantity: 1, note: '', vehicleId: '' });
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('cs-CZ') + ' ' + d.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });
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
          <h1 className="text-2xl font-bold text-gray-900">Sklad náhradních dílů</h1>
          <p className="text-gray-600 mt-1">Evidence příjmů a výdejů dílů na vozidla</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="btn-primary w-full sm:w-auto"
        >
          + Přidat díl
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
          <button onClick={() => setError(null)} className="ml-2 text-red-500 hover:text-red-700">&times;</button>
        </div>
      )}

      {/* Upozornění na nízký stav */}
      {parts.some(p => p.quantity <= p.minStock && p.minStock > 0) && (
        <div className="mb-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
          <div className="font-medium text-orange-800 mb-1">Nízký stav skladu</div>
          <div className="text-sm text-orange-700">
            {parts.filter(p => p.quantity <= p.minStock && p.minStock > 0).map(p => (
              <span key={p.id} className="inline-block mr-3">
                {p.name}: <strong>{p.quantity} {p.unit}</strong> (min. {p.minStock})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Seznam dílů */}
      {parts.length === 0 ? (
        <div className="card text-center py-12 text-gray-500">
          Sklad je prázdný. Přidejte první díl.
        </div>
      ) : (
        <div className="space-y-3">
          {parts.map((part) => (
            <div key={part.id} className="card">
              <div
                className="flex flex-col sm:flex-row sm:items-center gap-3 cursor-pointer"
                onClick={() => setExpandedPart(expandedPart === part.id ? null : part.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900">{part.name}</span>
                    {part.minStock > 0 && part.quantity <= part.minStock && (
                      <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-bold rounded-full">
                        Nízký stav
                      </span>
                    )}
                    {part.quantity === 0 && (
                      <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded-full">
                        Vyprodáno
                      </span>
                    )}
                  </div>
                  {part.note && (
                    <div className="text-sm text-gray-500 truncate">{part.note}</div>
                  )}
                </div>

                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="text-right">
                    <div className={`text-2xl font-bold ${
                      part.quantity === 0 ? 'text-red-600' :
                      part.quantity <= part.minStock && part.minStock > 0 ? 'text-orange-600' :
                      'text-gray-900'
                    }`}>
                      {part.quantity}
                    </div>
                    <div className="text-xs text-gray-500">{part.unit}</div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); startMovement(part, 'IN'); }}
                      className="px-2.5 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm font-bold hover:bg-green-200 transition-colors"
                      title="Příjem na sklad"
                    >
                      +
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); startMovement(part, 'OUT'); }}
                      disabled={part.quantity === 0}
                      className="px-2.5 py-1.5 bg-red-100 text-red-700 rounded-lg text-sm font-bold hover:bg-red-200 transition-colors disabled:opacity-50"
                      title="Výdej ze skladu"
                    >
                      -
                    </button>
                  </div>

                  <div className="text-gray-400 text-sm">
                    {expandedPart === part.id ? '▲' : '▼'}
                  </div>
                </div>
              </div>

              {/* Rozbalený detail - historie pohybů */}
              {expandedPart === part.id && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-gray-900 text-sm">Poslední pohyby</h4>
                    <div className="flex gap-2">
                      <button
                        onClick={() => startEdit(part)}
                        className="text-sm text-gray-600 hover:text-gray-900"
                      >
                        Upravit díl
                      </button>
                      <button
                        onClick={() => setDeletingPart(part)}
                        className="text-sm text-red-600 hover:text-red-800"
                      >
                        Smazat
                      </button>
                    </div>
                  </div>

                  {part.minStock > 0 && (
                    <div className="text-xs text-gray-500 mb-2">
                      Minimální stav: {part.minStock} {part.unit}
                    </div>
                  )}

                  {part.movements.length === 0 ? (
                    <p className="text-sm text-gray-500">Žádné pohyby</p>
                  ) : (
                    <div className="space-y-2">
                      {part.movements.map((m) => (
                        <div key={m.id} className="flex items-center gap-3 text-sm p-2 bg-gray-50 rounded-lg">
                          <span className={`px-2 py-0.5 rounded font-bold text-xs ${
                            m.type === 'IN' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {m.type === 'IN' ? '+' : '-'}{m.quantity}
                          </span>
                          <div className="flex-1 min-w-0">
                            {m.note && <span className="text-gray-700">{m.note}</span>}
                            {m.vehicle && (
                              <span className="text-gray-500 ml-1">
                                → {m.vehicle.spz} ({m.vehicle.name})
                              </span>
                            )}
                            {!m.note && !m.vehicle && (
                              <span className="text-gray-400">Bez poznámky</span>
                            )}
                          </div>
                          <span className="text-xs text-gray-400 flex-shrink-0">
                            {formatDate(m.createdAt)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal - přidání dílu */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white rounded-t-xl sm:rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Přidat díl</h3>
                <button onClick={() => setShowAddForm(false)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
              </div>
            </div>
            <form onSubmit={handleAddPart} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Název dílu</label>
                <input
                  type="text"
                  required
                  value={newPart.name}
                  onChange={(e) => setNewPart({ ...newPart, name: e.target.value })}
                  className="input"
                  placeholder="např. Brzdové destičky přední"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Počáteční množství</label>
                  <input
                    type="number"
                    min="0"
                    value={newPart.quantity}
                    onChange={(e) => setNewPart({ ...newPart, quantity: parseInt(e.target.value) || 0 })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Jednotka</label>
                  <select
                    value={newPart.unit}
                    onChange={(e) => setNewPart({ ...newPart, unit: e.target.value })}
                    className="input"
                  >
                    <option value="ks">ks</option>
                    <option value="l">l</option>
                    <option value="sada">sada</option>
                    <option value="pár">pár</option>
                    <option value="m">m</option>
                    <option value="kg">kg</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Minimální stav (pro upozornění)</label>
                <input
                  type="number"
                  min="0"
                  value={newPart.minStock}
                  onChange={(e) => setNewPart({ ...newPart, minStock: parseInt(e.target.value) || 0 })}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Poznámka</label>
                <input
                  type="text"
                  value={newPart.note}
                  onChange={(e) => setNewPart({ ...newPart, note: e.target.value })}
                  className="input"
                  placeholder="Volitelná poznámka"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowAddForm(false)} className="btn-secondary flex-1">Zrušit</button>
                <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
                  {isSubmitting ? 'Ukládám...' : 'Přidat'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal - editace dílu */}
      {editingPart && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white rounded-t-xl sm:rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Upravit díl</h3>
                <button onClick={() => setEditingPart(null)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
              </div>
            </div>
            <form onSubmit={handleEditPart} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Název dílu</label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="input"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Jednotka</label>
                  <select
                    value={editForm.unit}
                    onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })}
                    className="input"
                  >
                    <option value="ks">ks</option>
                    <option value="l">l</option>
                    <option value="sada">sada</option>
                    <option value="pár">pár</option>
                    <option value="m">m</option>
                    <option value="kg">kg</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Min. stav</label>
                  <input
                    type="number"
                    min="0"
                    value={editForm.minStock}
                    onChange={(e) => setEditForm({ ...editForm, minStock: parseInt(e.target.value) || 0 })}
                    className="input"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Poznámka</label>
                <input
                  type="text"
                  value={editForm.note}
                  onChange={(e) => setEditForm({ ...editForm, note: e.target.value })}
                  className="input"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setEditingPart(null)} className="btn-secondary flex-1">Zrušit</button>
                <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
                  {isSubmitting ? 'Ukládám...' : 'Uložit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal - pohyb skladu (příjem / výdej) */}
      {movementPart && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white rounded-t-xl sm:rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className={`p-6 border-b ${movementForm.type === 'IN' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  {movementForm.type === 'IN' ? '+ Příjem na sklad' : '- Výdej ze skladu'}
                </h3>
                <button onClick={() => setMovementPart(null)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
              </div>
              <p className="text-sm text-gray-600 mt-1">{movementPart.name} (skladem: {movementPart.quantity} {movementPart.unit})</p>
            </div>
            <form onSubmit={handleMovement} className="p-6 space-y-4">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setMovementForm({ ...movementForm, type: 'IN' })}
                  className={`flex-1 py-2 rounded-lg font-medium text-sm transition-colors ${
                    movementForm.type === 'IN'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  + Příjem
                </button>
                <button
                  type="button"
                  onClick={() => setMovementForm({ ...movementForm, type: 'OUT' })}
                  className={`flex-1 py-2 rounded-lg font-medium text-sm transition-colors ${
                    movementForm.type === 'OUT'
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  - Výdej
                </button>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Množství ({movementPart.unit})</label>
                <input
                  type="number"
                  min="1"
                  max={movementForm.type === 'OUT' ? movementPart.quantity : undefined}
                  required
                  value={movementForm.quantity}
                  onChange={(e) => setMovementForm({ ...movementForm, quantity: parseInt(e.target.value) || 1 })}
                  className="input"
                />
              </div>
              {movementForm.type === 'OUT' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Na vozidlo</label>
                  <select
                    value={movementForm.vehicleId}
                    onChange={(e) => setMovementForm({ ...movementForm, vehicleId: e.target.value })}
                    className="input"
                  >
                    <option value="">-- Vyberte vozidlo --</option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>{v.spz} - {v.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Poznámka</label>
                <input
                  type="text"
                  value={movementForm.note}
                  onChange={(e) => setMovementForm({ ...movementForm, note: e.target.value })}
                  className="input"
                  placeholder={movementForm.type === 'IN' ? 'Důvod příjmu...' : 'Důvod výdeje...'}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setMovementPart(null)} className="btn-secondary flex-1">Zrušit</button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`flex-1 px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 ${
                    movementForm.type === 'IN'
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {isSubmitting ? 'Ukládám...' : movementForm.type === 'IN' ? 'Přijmout' : 'Vydat'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal - potvrzení smazání */}
      {deletingPart && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white rounded-t-xl sm:rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Smazat díl</h3>
            <p className="text-gray-600 mb-6">
              Opravdu chcete smazat <strong>{deletingPart.name}</strong>? Smaže se i celá historie pohybů.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeletingPart(null)} className="btn-secondary flex-1">Zrušit</button>
              <button
                onClick={handleDeletePart}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {isSubmitting ? 'Mazání...' : 'Smazat'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
