'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { AvailabilityStatus, statusLabels } from './Calendar';
import { cn } from '@/lib/utils';

interface AvailabilityModalProps {
  date: Date;
  currentStatus: AvailabilityStatus;
  currentNote?: string;
  onSave: (status: AvailabilityStatus, note: string) => Promise<void>;
  onClose: () => void;
}

export function AvailabilityModal({
  date,
  currentStatus,
  currentNote = '',
  onSave,
  onClose,
}: AvailabilityModalProps) {
  const [status, setStatus] = useState<AvailabilityStatus>(currentStatus);
  const [note, setNote] = useState(currentNote);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setStatus(currentStatus);
    setNote(currentNote);
  }, [currentStatus, currentNote]);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await onSave(status, note);
      onClose();
    } catch (error) {
      console.error('Chyba při ukládání:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const statusOptions: { value: AvailabilityStatus; label: string; color: string }[] = [
    { value: 'AVAILABLE', label: 'Dostupný', color: 'bg-green-500' },
    { value: 'PARTIAL', label: 'Částečně dostupný', color: 'bg-orange-500' },
    { value: 'UNAVAILABLE', label: 'Nedostupný', color: 'bg-red-500' },
    { value: null, label: 'Neuvedeno', color: 'bg-gray-300' },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            Nastavit dostupnost
          </h3>
          <p className="text-gray-600 mb-6">
            {format(date, 'EEEE d. MMMM yyyy', { locale: cs })}
          </p>

          <div className="space-y-3 mb-6">
            {statusOptions.map((option) => (
              <button
                key={option.value ?? 'null'}
                onClick={() => setStatus(option.value)}
                className={cn(
                  'w-full flex items-center space-x-3 p-3 rounded-lg border-2 transition-colors',
                  status === option.value
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                )}
              >
                <span className={cn('w-4 h-4 rounded', option.color)} />
                <span className="font-medium">{option.label}</span>
              </button>
            ))}
          </div>

          <div className="mb-6">
            <label htmlFor="note" className="label">
              Poznámka (volitelné)
            </label>
            <textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="input min-h-[80px]"
              placeholder="Např. dostupný od 14:00..."
            />
          </div>

          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="btn-secondary flex-1"
              disabled={isLoading}
            >
              Zrušit
            </button>
            <button
              onClick={handleSave}
              className="btn-primary flex-1"
              disabled={isLoading}
            >
              {isLoading ? 'Ukládání...' : 'Uložit'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
