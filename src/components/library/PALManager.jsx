import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2, Edit, BookOpen, Calendar, Search, X, Check } from "lucide-react";

export default function PALManager({ open, onOpenChange, pals }) {
  const [name, setName] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState(new Date().getFullYear());
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("📚");
  const [selectedBookIds, setSelectedBookIds] = useState([]);
  const [editingPAL, setEditingPAL] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const queryClient = useQueryClient();

  const [user, setUser] = useState(null);
  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: myBooks = [] } = useQuery({
    queryKey: ['myBooks'],
    queryFn: () => base44.entities.UserBook.filter({ created_by: user?.email }),
    enabled: !!user && open,
  });

  const { data: allBooks = [] } = useQuery({
    queryKey: ['books'],
    queryFn: () => base44.entities.Book.list(),
    enabled: open,
  });

  // Filter books that are "À lire"
  const toReadBooks = myBooks.filter(ub => ub.status === "À lire");
  const toReadBookIds = toReadBooks.map(ub => ub.book_id);
  const availableBooks = allBooks.filter(b => toReadBookIds.includes(b.id));

  // Filter books by search query
  const filteredBooks = searchQuery.length >= 2
    ? availableBooks.filter(book =>
        book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        book.author.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  useEffect(() => {
    if (editingPAL) {
      setName(editingPAL.name || "");
      setMonth(editingPAL.month?.toString() || "");
      setYear(editingPAL.year || new Date().getFullYear());
      setDescription(editingPAL.description || "");
      setIcon(editingPAL.icon || "📚");
      setSelectedBookIds(editingPAL.book_ids || []);
    }
  }, [editingPAL]);

  const createPALMutation = useMutation({
    mutationFn: (data) => base44.entities.ReadingList.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['readingLists'] });
      toast.success("PAL créée !");
      resetForm();
    },
    onError: (error) => {
      console.error("Error creating PAL:", error);
      toast.error("Erreur lors de la création de la PAL");
    }
  });

  const updatePALMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ReadingList.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['readingLists'] });
      toast.success("PAL mise à jour !");
      resetForm();
      setEditingPAL(null);
    },
    onError: (error) => {
      console.error("Error updating PAL:", error);
      toast.error("Erreur lors de la mise à jour");
    }
  });

  const deletePALMutation = useMutation({
    mutationFn: (id) => base44.entities.ReadingList.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['readingLists'] });
      toast.success("PAL supprimée");
    },
    onError: (error) => {
      console.error("Error deleting PAL:", error);
      toast.error("Erreur lors de la suppression");
    }
  });

  const resetForm = () => {
    setName("");
    setMonth("");
    setYear(new Date().getFullYear());
    setDescription("");
    setIcon("📚");
    setSelectedBookIds([]);
    setSearchQuery("");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Le nom est requis");
      return;
    }

    const data = {
      name: name.trim(),
      month: month ? parseInt(month) : undefined,
      year,
      description: description.trim() || undefined,
      icon,
      book_ids: selectedBookIds,
    };

    if (editingPAL) {
      updatePALMutation.mutate({ id: editingPAL.id, data });
    } else {
      createPALMutation.mutate(data);
    }
  };

  const handleDelete = (palId) => {
    if (window.confirm("Êtes-vous sûre de vouloir supprimer cette PAL ?")) {
      deletePALMutation.mutate(palId);
    }
  };

  const handleEdit = (pal) => {
    setEditingPAL(pal);
  };

  const toggleBookSelection = (bookId) => {
    setSelectedBookIds(prev =>
      prev.includes(bookId)
        ? prev.filter(id => id !== bookId)
        : [...prev, bookId]
    );
  };

  const handleClose = () => {
    resetForm();
    setEditingPAL(null);
    onOpenChange(false);
  };

  const monthNames = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
  ];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl" style={{ color: 'var(--dark-text)' }}>
            {editingPAL ? "✏️ Modifier la PAL" : "📚 Gérer mes PAL"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Create/Edit Form */}
          <form onSubmit={handleSubmit} className="space-y-4 p-4 rounded-xl" 
                style={{ backgroundColor: 'var(--cream)' }}>
            <h3 className="font-bold text-lg" style={{ color: 'var(--dark-text)' }}>
              {editingPAL ? "Modifier cette PAL" : "Créer une nouvelle PAL"}
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Nom de la PAL *</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: PAL Novembre 2025"
                  required
                />
              </div>

              <div>
                <Label>Mois</Label>
                <Select value={month} onValueChange={setMonth}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir un mois" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>Aucun mois</SelectItem>
                    {monthNames.map((m, idx) => (
                      <SelectItem key={idx} value={(idx + 1).toString()}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Année</Label>
                <Input
                  type="number"
                  value={year}
                  onChange={(e) => setYear(parseInt(e.target.value))}
                  min={2020}
                  max={2050}
                />
              </div>

              <div className="col-span-2">
                <Label>Description</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Décrivez cette PAL..."
                  rows={2}
                />
              </div>

              <div className="col-span-2">
                <Label>Emoji</Label>
                <Input
                  value={icon}
                  onChange={(e) => setIcon(e.target.value)}
                  placeholder="Choisissez un emoji (ex: 📚, 🎯, ⭐)"
                  className="text-2xl text-center"
                  maxLength={2}
                />
                <p className="text-xs mt-1" style={{ color: 'var(--warm-pink)' }}>
                  💡 Tapez ou collez l'emoji de votre choix
                </p>
              </div>
            </div>

            {/* Book Selection */}
            <div>
              <Label>Livres dans cette PAL ({selectedBookIds.length})</Label>
              <p className="text-xs mb-2" style={{ color: 'var(--warm-pink)' }}>
                Recherchez et sélectionnez des livres marqués "À lire"
              </p>

              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" 
                        style={{ color: 'var(--warm-pink)' }} />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher un livre..."
                  className="pl-10"
                />
              </div>

              {/* Selected Books */}
              {selectedBookIds.length > 0 && (
                <div className="mb-3 p-3 rounded-lg" style={{ backgroundColor: 'white' }}>
                  <p className="text-sm font-bold mb-2" style={{ color: 'var(--dark-text)' }}>
                    {selectedBookIds.length} livre{selectedBookIds.length > 1 ? 's' : ''} sélectionné{selectedBookIds.length > 1 ? 's' : ''}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {selectedBookIds.map(bookId => {
                      const book = allBooks.find(b => b.id === bookId);
                      if (!book) return null;
                      return (
                        <div
                          key={bookId}
                          className="flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium text-white"
                          style={{ backgroundColor: 'var(--soft-pink)' }}
                        >
                          <span>{book.title}</span>
                          <button
                            type="button"
                            onClick={() => toggleBookSelection(bookId)}
                            className="hover:opacity-70"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Search Results */}
              {searchQuery.length >= 2 && filteredBooks.length > 0 && (
                <div className="border rounded-lg max-h-64 overflow-y-auto" 
                     style={{ borderColor: 'var(--beige)' }}>
                  {filteredBooks.map(book => {
                    const isSelected = selectedBookIds.includes(book.id);
                    return (
                      <button
                        key={book.id}
                        type="button"
                        onClick={() => toggleBookSelection(book.id)}
                        className="w-full flex items-center gap-3 p-3 hover:bg-pink-50 transition-colors text-left border-b last:border-b-0"
                        style={{
                          backgroundColor: isSelected ? 'var(--cream)' : 'white',
                          borderColor: 'var(--beige)'
                        }}
                      >
                        <div className="w-10 h-14 rounded overflow-hidden flex-shrink-0" 
                             style={{ backgroundColor: 'var(--beige)' }}>
                          {book.cover_url ? (
                            <img src={book.cover_url} alt={book.title} 
                                 className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <BookOpen className="w-5 h-5" style={{ color: 'var(--warm-pink)' }} />
                            </div>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm line-clamp-1" 
                             style={{ color: 'var(--dark-text)' }}>
                            {book.title}
                          </p>
                          <p className="text-xs line-clamp-1" 
                             style={{ color: 'var(--warm-pink)' }}>
                            {book.author}
                          </p>
                        </div>

                        {isSelected && (
                          <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                               style={{ backgroundColor: 'var(--deep-pink)' }}>
                            <Check className="w-4 h-4 text-white" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {searchQuery.length >= 2 && filteredBooks.length === 0 && (
                <p className="text-center py-4 text-sm" style={{ color: 'var(--warm-pink)' }}>
                  Aucun livre "À lire" trouvé
                </p>
              )}
            </div>

            <div className="flex gap-3 pt-4">
              {editingPAL && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditingPAL(null);
                    resetForm();
                  }}
                >
                  Annuler
                </Button>
              )}
              <Button
                type="submit"
                disabled={!name.trim() || createPALMutation.isPending || updatePALMutation.isPending}
                className="flex-1 text-white font-medium"
                style={{ background: 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))' }}
              >
                {editingPAL ? "Mettre à jour" : "Créer la PAL"}
              </Button>
            </div>
          </form>

          {/* Existing PALs List */}
          {!editingPAL && pals.length > 0 && (
            <div>
              <h3 className="font-bold text-lg mb-4" style={{ color: 'var(--dark-text)' }}>
                Mes PAL existantes ({pals.length})
              </h3>
              <div className="space-y-3">
                {pals.map(pal => {
                  const monthName = pal.month ? monthNames[pal.month - 1] : "";
                  return (
                    <div
                      key={pal.id}
                      className="flex items-center justify-between p-4 rounded-xl"
                      style={{ backgroundColor: 'var(--cream)' }}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <span className="text-2xl">{pal.icon}</span>
                        <div className="flex-1">
                          <p className="font-bold" style={{ color: 'var(--dark-text)' }}>
                            {pal.name}
                          </p>
                          <p className="text-xs" style={{ color: 'var(--warm-pink)' }}>
                            {monthName && `${monthName} `}{pal.year} • {pal.book_ids?.length || 0} livre{(pal.book_ids?.length || 0) > 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(pal)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(pal.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}