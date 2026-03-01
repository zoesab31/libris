import React, { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BookOpen, Check, Plus, X } from "lucide-react";
import { toast } from "sonner";

export default function BookPickerDialog({
  open,
  onClose,
  selectedDays,
  booksForPicker,
  bookOverrides,
  getBookIdsForDay,
  onSave,
}) {
  // Build a shared set of currently selected book ids across all selected days
  // (intersection or union — we use union to show what's already assigned)
  const [pickedIds, setPickedIds] = useState(null); // null = not yet initialized

  // Initialize pickedIds when dialog opens
  const initialPickedIds = useMemo(() => {
    if (!open || selectedDays.size === 0) return new Set();
    // If single day: use its current books; if multi-day: start empty
    if (selectedDays.size === 1) {
      const d = [...selectedDays][0];
      return new Set(getBookIdsForDay(d));
    }
    return new Set();
  }, [open, selectedDays]);

  const currentPickedIds = pickedIds ?? initialPickedIds;

  const handleOpen = (isOpen) => {
    if (isOpen) {
      setPickedIds(null); // reset to auto-init
    } else {
      onClose();
    }
  };

  const toggleBook = (bookId) => {
    const next = new Set(currentPickedIds);
    if (next.has(bookId)) {
      next.delete(bookId);
    } else {
      next.add(bookId);
    }
    setPickedIds(next);
  };

  const handleConfirm = () => {
    const ids = [...currentPickedIds];
    if (ids.length === 0) {
      // Reset to auto-detect
      const newOverrides = { ...bookOverrides };
      selectedDays.forEach(d => delete newOverrides[d]);
      onSave(newOverrides);
      toast.success('Détection automatique restaurée');
    } else {
      const newOverrides = { ...bookOverrides };
      selectedDays.forEach(d => { newOverrides[d] = ids; });
      onSave(newOverrides);
      toast.success(`${ids.length} livre${ids.length > 1 ? 's' : ''} assigné${ids.length > 1 ? 's' : ''} ✅`);
    }
  };

  const handleReset = () => {
    const newOverrides = { ...bookOverrides };
    selectedDays.forEach(d => delete newOverrides[d]);
    onSave(newOverrides);
    toast.success('Détection automatique restaurée');
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-w-sm rounded-3xl">
        <DialogHeader>
          <DialogTitle style={{ color: '#7C3AED' }}>
            📖 Livres pour {selectedDays.size > 1 ? `ces ${selectedDays.size} jours` : 'ce jour'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 pt-1">
          <p className="text-xs text-gray-400">
            Sélectionne un ou plusieurs livres — ils s'afficheront côte à côte sur la case.
          </p>

          {/* Selected preview */}
          {currentPickedIds.size > 0 && (
            <div className="flex gap-1.5 flex-wrap">
              {[...currentPickedIds].map(id => {
                const b = booksForPicker.find(x => x.id === id);
                if (!b) return null;
                return (
                  <div key={id} className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold"
                    style={{ background: '#EDE9FE', color: '#7C3AED' }}>
                    {b.title.length > 20 ? b.title.slice(0, 18) + '…' : b.title}
                    <button onClick={() => toggleBook(id)}>
                      <X style={{ width: 10, height: 10 }} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Book list */}
          <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
            {booksForPicker.map(book => {
              const isChecked = currentPickedIds.has(book.id);
              return (
                <button
                  key={book.id}
                  onClick={() => toggleBook(book.id)}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-all"
                  style={{
                    background: isChecked ? '#EDE9FE' : '#F8F5FF',
                    border: isChecked ? '2px solid #7C3AED' : '2px solid transparent',
                  }}
                >
                  {book.cover_url
                    ? <img src={book.cover_url} alt="" className="w-8 h-11 object-cover rounded-lg flex-shrink-0" />
                    : <div className="w-8 h-11 rounded-lg flex-shrink-0 flex items-center justify-center" style={{ background: '#FFE9F0' }}>
                        <BookOpen className="w-4 h-4" style={{ color: '#FF69B4' }} />
                      </div>
                  }
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm line-clamp-1" style={{ color: '#2D1F3F' }}>{book.title}</p>
                    <p className="text-xs text-gray-500 line-clamp-1">{book.author}</p>
                  </div>
                  {isChecked && <Check style={{ width: 16, height: 16, color: '#7C3AED', flexShrink: 0 }} />}
                </button>
              );
            })}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleConfirm}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white"
              style={{ background: currentPickedIds.size > 0 ? '#7C3AED' : '#9CA3AF' }}
            >
              {currentPickedIds.size > 0 ? `Valider (${currentPickedIds.size})` : 'Valider'}
            </button>
            <button
              onClick={handleReset}
              className="px-3 py-2.5 rounded-xl text-sm font-semibold"
              style={{ background: '#F3F4F6', color: '#6B7280' }}
            >
              ↩ Auto
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}