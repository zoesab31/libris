import React, { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Layers, Search, Plus, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function AddToSeriesDialog({ open, onOpenChange, book, currentSeries, allSeries }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSeriesId, setSelectedSeriesId] = useState(currentSeries?.id || "");
  const [creatingNew, setCreatingNew] = useState(false);
  const [newSeriesName, setNewSeriesName] = useState("");
  const [newSeriesAuthor, setNewSeriesAuthor] = useState(book?.author || "");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const queryClient = useQueryClient();

  const { data: user } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });

  const filteredSeries = useMemo(() => {
    if (!searchQuery.trim()) return allSeries;
    const query = searchQuery.toLowerCase();
    return allSeries.filter(s => s.series_name.toLowerCase().includes(query) || s.author?.toLowerCase().includes(query));
  }, [allSeries, searchQuery]);

  const selectedSeries = useMemo(() => allSeries.find(s => s.id === selectedSeriesId), [allSeries, selectedSeriesId]);

  useEffect(() => {
    if (open) {
      if (currentSeries) { setSearchQuery(currentSeries.series_name); setSelectedSeriesId(currentSeries.id); }
      else { setSearchQuery(""); setSelectedSeriesId(""); }
      setCreatingNew(false); setNewSeriesName(""); setNewSeriesAuthor(book?.author || ""); setShowSuggestions(false);
    }
  }, [open, currentSeries, book]);

  const addToSeriesMutation = useMutation({
    mutationFn: async (seriesId) => {
      if (!user) throw new Error("User not loaded.");
      if (currentSeries && currentSeries.id !== seriesId) {
        await base44.entities.BookSeries.update(currentSeries.id, {
          books_read: (currentSeries.books_read || []).filter(id => id !== book.id),
          books_in_pal: (currentSeries.books_in_pal || []).filter(id => id !== book.id),
          books_wishlist: (currentSeries.books_wishlist || []).filter(id => id !== book.id)
        });
      }
      const targetSeries = allSeries.find(s => s.id === seriesId);
      if (!targetSeries) return;
      const userBookData = await base44.entities.UserBook.filter({ book_id: book.id, created_by: user.email });
      const status = userBookData[0]?.status;
      let booksRead = (targetSeries.books_read || []).filter(id => id !== book.id);
      let booksInPal = (targetSeries.books_in_pal || []).filter(id => id !== book.id);
      let booksWishlist = (targetSeries.books_wishlist || []).filter(id => id !== book.id);
      if (status === "Lu") booksRead.push(book.id);
      else if (status === "À lire") booksInPal.push(book.id);
      else booksWishlist.push(book.id);
      await base44.entities.BookSeries.update(seriesId, {
        books_read: Array.from(new Set(booksRead)),
        books_in_pal: Array.from(new Set(booksInPal)),
        books_wishlist: Array.from(new Set(booksWishlist))
      });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['bookSeries'] }); toast.success("✅ Livre ajouté à la saga !"); onOpenChange(false); },
  });

  const createSeriesMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("User not loaded.");
      if (currentSeries) {
        await base44.entities.BookSeries.update(currentSeries.id, {
          books_read: (currentSeries.books_read || []).filter(id => id !== book.id),
          books_in_pal: (currentSeries.books_in_pal || []).filter(id => id !== book.id),
          books_wishlist: (currentSeries.books_wishlist || []).filter(id => id !== book.id)
        });
      }
      const userBookData = await base44.entities.UserBook.filter({ book_id: book.id, created_by: user.email });
      const status = userBookData[0]?.status;
      await base44.entities.BookSeries.create({
        series_name: newSeriesName, author: newSeriesAuthor, total_books: 1,
        books_read: status === "Lu" ? [book.id] : [],
        books_in_pal: status === "À lire" ? [book.id] : [],
        books_wishlist: status !== "Lu" && status !== "À lire" ? [book.id] : [],
        created_by: user.email
      });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['bookSeries'] }); toast.success("✅ Nouvelle saga créée !"); onOpenChange(false); },
  });

  const removeFromSeriesMutation = useMutation({
    mutationFn: async () => {
      if (!currentSeries) return;
      await base44.entities.BookSeries.update(currentSeries.id, {
        books_read: (currentSeries.books_read || []).filter(id => id !== book.id),
        books_in_pal: (currentSeries.books_in_pal || []).filter(id => id !== book.id),
        books_wishlist: (currentSeries.books_wishlist || []).filter(id => id !== book.id)
      });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['bookSeries'] }); toast.success("✅ Livre retiré de la saga !"); onOpenChange(false); },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2" style={{ color: 'var(--dark-text)' }}>
            <Layers className="w-6 h-6" />
            {creatingNew ? "Créer une nouvelle saga" : "Ajouter à une saga"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {!creatingNew ? (
            <>
              <div className="relative">
                <Label className="mb-2 block">Rechercher ou créer une saga</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--warm-pink)' }} />
                  <Input
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setShowSuggestions(true); if (!e.target.value.trim()) setSelectedSeriesId(""); }}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    placeholder="Tapez le nom d'une saga..."
                    className="pl-10" />
                </div>
                {showSuggestions && searchQuery.trim() && (
                  <div className="absolute z-50 w-full mt-1 bg-white rounded-xl shadow-xl border-2 max-h-64 overflow-y-auto" style={{ borderColor: 'var(--beige)' }}>
                    {filteredSeries.length > 0 && filteredSeries.map(series => (
                      <button key={series.id} onMouseDown={() => { setSelectedSeriesId(series.id); setSearchQuery(series.series_name); setShowSuggestions(false); }}
                        className="w-full text-left px-4 py-3 hover:bg-pink-50 transition-colors border-b last:border-b-0" style={{ borderColor: 'var(--beige)' }}>
                        <p className="font-bold text-sm" style={{ color: 'var(--dark-text)' }}>{series.series_name}</p>
                        <p className="text-xs" style={{ color: 'var(--warm-pink)' }}>{series.author}</p>
                      </button>
                    ))}
                    <button onMouseDown={() => { setNewSeriesName(searchQuery); setCreatingNew(true); setShowSuggestions(false); }}
                      className="w-full text-left px-4 py-3 border-t-2 hover:bg-purple-50 transition-colors" style={{ borderColor: 'var(--beige)' }}>
                      <div className="flex items-center gap-2">
                        <Plus className="w-4 h-4" style={{ color: 'var(--deep-pink)' }} />
                        <p className="font-bold text-sm" style={{ color: 'var(--deep-pink)' }}>Créer "{searchQuery}"</p>
                      </div>
                    </button>
                  </div>
                )}
              </div>
              {selectedSeriesId && selectedSeries && (
                <div className="p-4 rounded-xl" style={{ backgroundColor: '#E6B3E8' }}>
                  <p className="font-bold text-white">{selectedSeries.series_name}</p>
                  <p className="text-sm text-white/90">{selectedSeries.author}</p>
                </div>
              )}
              <div className="flex flex-col gap-2 pt-4">
                <Button onClick={() => addToSeriesMutation.mutate(selectedSeriesId)} disabled={!selectedSeriesId || addToSeriesMutation.isPending} className="w-full text-white" style={{ background: 'linear-gradient(135deg, #E6B3E8, #FFB6C8)' }}>
                  {addToSeriesMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Ajout...</> : <><Layers className="w-4 h-4 mr-2" />Ajouter à cette saga</>}
                </Button>
                {currentSeries && (
                  <Button onClick={() => removeFromSeriesMutation.mutate()} disabled={removeFromSeriesMutation.isPending} variant="outline" className="w-full text-red-600 border-red-300 hover:bg-red-50">
                    {removeFromSeriesMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Retrait...</> : <><X className="w-4 h-4 mr-2" />Retirer de "{currentSeries.series_name}"</>}
                  </Button>
                )}
              </div>
            </>
          ) : (
            <>
              <div><Label>Nom de la saga *</Label><Input value={newSeriesName} onChange={e => setNewSeriesName(e.target.value)} placeholder="Ex: La Passe-Miroir, Keleana..." /></div>
              <div><Label>Auteur</Label><Input value={newSeriesAuthor} onChange={e => setNewSeriesAuthor(e.target.value)} placeholder="Auteur de la saga" /></div>
              <div className="flex gap-2 pt-2">
                <Button onClick={() => createSeriesMutation.mutate()} disabled={!newSeriesName.trim() || createSeriesMutation.isPending} className="flex-1 text-white" style={{ background: 'linear-gradient(135deg, #E6B3E8, #FFB6C8)' }}>
                  {createSeriesMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Création...</> : <><Plus className="w-4 h-4 mr-2" />Créer la saga</>}
                </Button>
                <Button onClick={() => { setCreatingNew(false); setNewSeriesName(""); }} variant="outline">Annuler</Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}