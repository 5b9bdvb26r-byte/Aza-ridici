'use client';

import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';

interface NoteCategory {
  id: string;
  name: string;
  createdAt: string;
  notes: { id: string }[];
}

interface Note {
  id: string;
  text: string;
  categoryId: string;
  createdAt: string;
  updatedAt: string;
  category: { id: string; name: string };
}

export default function NotesPage() {
  const [categories, setCategories] = useState<NoteCategory[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Modály
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{ type: 'category' | 'note'; id: string } | null>(null);

  // Editace
  const [editingCategory, setEditingCategory] = useState<NoteCategory | null>(null);
  const [editingNote, setEditingNote] = useState<Note | null>(null);

  // Formuláře
  const [categoryName, setCategoryName] = useState('');
  const [noteText, setNoteText] = useState('');

  const fetchCategories = useCallback(async () => {
    try {
      const response = await fetch('/api/notes/categories');
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (error) {
      console.error('Chyba při načítání kategorií:', error);
    }
  }, []);

  const fetchNotes = useCallback(async (categoryId: string) => {
    try {
      const response = await fetch(`/api/notes?categoryId=${categoryId}`);
      if (response.ok) {
        const data = await response.json();
        setNotes(data);
      }
    } catch (error) {
      console.error('Chyba při načítání poznámek:', error);
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      await fetchCategories();
      setIsLoading(false);
    };
    load();
  }, [fetchCategories]);

  useEffect(() => {
    if (selectedCategoryId) {
      fetchNotes(selectedCategoryId);
    } else {
      setNotes([]);
    }
  }, [selectedCategoryId, fetchNotes]);

  // Kategorie CRUD
  const handleSaveCategory = async () => {
    if (!categoryName.trim()) return;

    const url = editingCategory
      ? `/api/notes/categories/${editingCategory.id}`
      : '/api/notes/categories';
    const method = editingCategory ? 'PUT' : 'POST';

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: categoryName }),
    });

    if (response.ok) {
      await fetchCategories();
      setShowCategoryModal(false);
      setCategoryName('');
      setEditingCategory(null);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    const response = await fetch(`/api/notes/categories/${id}`, { method: 'DELETE' });
    if (response.ok) {
      if (selectedCategoryId === id) {
        setSelectedCategoryId(null);
        setNotes([]);
      }
      await fetchCategories();
      setShowDeleteConfirm(null);
    }
  };

  // Poznámky CRUD
  const handleSaveNote = async () => {
    if (!noteText.trim() || !selectedCategoryId) return;

    const url = editingNote
      ? `/api/notes/${editingNote.id}`
      : '/api/notes';
    const method = editingNote ? 'PUT' : 'POST';

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: noteText, categoryId: selectedCategoryId }),
    });

    if (response.ok) {
      await fetchNotes(selectedCategoryId);
      await fetchCategories();
      setShowNoteModal(false);
      setNoteText('');
      setEditingNote(null);
    }
  };

  const handleDeleteNote = async (id: string) => {
    if (!selectedCategoryId) return;
    const response = await fetch(`/api/notes/${id}`, { method: 'DELETE' });
    if (response.ok) {
      await fetchNotes(selectedCategoryId);
      await fetchCategories();
      setShowDeleteConfirm(null);
    }
  };

  const openEditCategory = (cat: NoteCategory) => {
    setEditingCategory(cat);
    setCategoryName(cat.name);
    setShowCategoryModal(true);
  };

  const openNewCategory = () => {
    setEditingCategory(null);
    setCategoryName('');
    setShowCategoryModal(true);
  };

  const openEditNote = (note: Note) => {
    setEditingNote(note);
    setNoteText(note.text);
    setShowNoteModal(true);
  };

  const openNewNote = () => {
    setEditingNote(null);
    setNoteText('');
    setShowNoteModal(true);
  };

  const selectedCategory = categories.find((c) => c.id === selectedCategoryId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Načítání...</div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Poznámky</h1>

      <div className="flex gap-6">
        {/* Levý panel - Kategorie */}
        <div className="w-72 flex-shrink-0">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Kategorie</h2>
              <button
                onClick={openNewCategory}
                className="text-sm px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                + Nová
              </button>
            </div>

            {categories.length === 0 ? (
              <p className="text-gray-500 text-sm">Zatím žádné kategorie. Vytvořte první.</p>
            ) : (
              <div className="space-y-1">
                {categories.map((cat) => (
                  <div
                    key={cat.id}
                    className={`group flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
                      selectedCategoryId === cat.id
                        ? 'bg-primary-50 text-primary-700 border border-primary-200'
                        : 'hover:bg-gray-50 text-gray-700'
                    }`}
                    onClick={() => setSelectedCategoryId(cat.id)}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="truncate font-medium">{cat.name}</span>
                      <span className="text-xs text-gray-400 flex-shrink-0">
                        {cat.notes.length}
                      </span>
                    </div>
                    <div className="hidden group-hover:flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); openEditCategory(cat); }}
                        className="text-gray-400 hover:text-primary-600 text-xs px-1"
                        title="Upravit"
                      >
                        ✎
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm({ type: 'category', id: cat.id }); }}
                        className="text-gray-400 hover:text-red-600 text-xs px-1"
                        title="Smazat"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Pravý panel - Poznámky */}
        <div className="flex-1 min-w-0">
          {selectedCategory ? (
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  {selectedCategory.name}
                </h2>
                <button
                  onClick={openNewNote}
                  className="text-sm px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  + Nová poznámka
                </button>
              </div>

              {notes.length === 0 ? (
                <p className="text-gray-500 text-sm">V této kategorii nejsou žádné poznámky.</p>
              ) : (
                <div className="space-y-3">
                  {notes.map((note) => (
                    <div
                      key={note.id}
                      className="group border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-gray-800 whitespace-pre-wrap flex-1">{note.text}</p>
                        <div className="hidden group-hover:flex items-center gap-1 flex-shrink-0 mt-0.5">
                          <button
                            onClick={() => openEditNote(note)}
                            className="text-gray-400 hover:text-primary-600 text-sm px-1.5 py-0.5"
                            title="Upravit"
                          >
                            ✎
                          </button>
                          <button
                            onClick={() => setShowDeleteConfirm({ type: 'note', id: note.id })}
                            className="text-gray-400 hover:text-red-600 text-sm px-1.5 py-0.5"
                            title="Smazat"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-gray-400 mt-2">
                        {format(new Date(note.createdAt), 'd. MMMM yyyy, HH:mm', { locale: cs })}
                        {note.updatedAt !== note.createdAt && ' (upraveno)'}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="card text-center py-12">
              <p className="text-gray-500">Vyberte kategorii pro zobrazení poznámek</p>
            </div>
          )}
        </div>
      </div>

      {/* Modál - Kategorie */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">
              {editingCategory ? 'Upravit kategorii' : 'Nová kategorie'}
            </h3>
            <input
              type="text"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              placeholder="Název kategorie"
              className="input w-full mb-4"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleSaveCategory()}
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setShowCategoryModal(false); setEditingCategory(null); setCategoryName(''); }}
                className="btn-secondary"
              >
                Zrušit
              </button>
              <button onClick={handleSaveCategory} className="btn-primary">
                {editingCategory ? 'Uložit' : 'Vytvořit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modál - Poznámka */}
      {showNoteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg mx-4">
            <h3 className="text-lg font-semibold mb-4">
              {editingNote ? 'Upravit poznámku' : 'Nová poznámka'}
            </h3>
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Text poznámky..."
              className="input w-full mb-4 min-h-[120px] resize-y"
              autoFocus
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setShowNoteModal(false); setEditingNote(null); setNoteText(''); }}
                className="btn-secondary"
              >
                Zrušit
              </button>
              <button onClick={handleSaveNote} className="btn-primary">
                {editingNote ? 'Uložit' : 'Vytvořit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Potvrzení smazání */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-2">Potvrdit smazání</h3>
            <p className="text-gray-600 mb-4">
              {showDeleteConfirm.type === 'category'
                ? 'Opravdu chcete smazat tuto kategorii? Všechny poznámky v ní budou také smazány.'
                : 'Opravdu chcete smazat tuto poznámku?'}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="btn-secondary"
              >
                Zrušit
              </button>
              <button
                onClick={() =>
                  showDeleteConfirm.type === 'category'
                    ? handleDeleteCategory(showDeleteConfirm.id)
                    : handleDeleteNote(showDeleteConfirm.id)
                }
                className="btn-danger"
              >
                Smazat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
