import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { BookOpen, Plus, Search, TrendingUp, Clock, Check, ShoppingCart, Sparkles, ChevronLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

// Helper to determine book status color
const getBookStatusColor = (bookId, myBooks) => {
  const userBook = myBooks.find(ub => ub.book_id === bookId);
  if (!userBook) return { color: '#93C5FD', icon: '🔵', label: 'À acheter' }; // Blue - to buy
  
  if (userBook.status === "Lu") return { color: '#A78BFA', icon: '🔷', label: 'Lu' }; // Purple - read
  if (userBook.status === "En cours") return { color: '#FCD34D', icon: '📖', label: 'En cours' }; // Yellow - reading
  if (userBook.status === "À lire" || userBook.status === "Mes envies") {
    return { color: '#E5E7EB', icon: '⚪', label: 'Non lu' }; // Gray - unread
  }
  
  return { color: '#E5E7EB', icon: '⚪', label: 'Non lu' };
};

export default function SeriesTracking() {
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedSeries, setSelectedSeries] = useState(null);
  const [sortBy, setSortBy] = useState("all"); // all, in_progress, completed
  const queryClient = useQueryClient();

  // New series form data
  const [newSeries, setNewSeries] = useState({
    series_name: "",
    author: "",
    total_books: "",
    cover_url: "",
    description: ""
  });

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: mySeries = [] } = useQuery({
    queryKey: ['bookSeries'],
    queryFn: () => base44.entities.BookSeries.filter({ created_by: user?.email }),
    enabled: !!user,
  });

  const { data: myBooks = [] } = useQuery({
    queryKey: ['myBooks'],
    queryFn: () => base44.entities.UserBook.filter({ created_by: user?.email }),
    enabled: !!user,
  });

  const { data: allBooks = [] } = useQuery({
    queryKey: ['books'],
    queryFn: () => base44.entities.Book.list(),
  });

  // Calculate series statistics
  const seriesStats = useMemo(() => {
    const inProgress = mySeries.filter(s => {
      const readCount = (s.books_read || []).length;
      return readCount > 0 && readCount < s.total_books;
    }).length;

    const completed = mySeries.filter(s => {
      const readCount = (s.books_read || []).length;
      return readCount === s.total_books;
    }).length;

    const toBuy = mySeries.reduce((sum, s) => {
      const ownedBooks = [...(s.books_read || []), ...(s.books_in_pal || []), ...(s.books_wishlist || [])];
      return sum + Math.max(0, s.total_books - ownedBooks.length);
    }, 0);

    const totalProgress = mySeries.reduce((sum, s) => {
      return sum + ((s.books_read || []).length / s.total_books) * 100;
    }, 0);

    return {
      inProgress,
      completed,
      toBuy,
      avgProgress: mySeries.length > 0 ? (totalProgress / mySeries.length).toFixed(0) : 0
    };
  }, [mySeries]);

  // Filter series
  const filteredSeries = useMemo(() => {
    let filtered = mySeries;

    // Search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(s => 
        s.series_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.author?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Status filter
    if (sortBy === "in_progress") {
      filtered = filtered.filter(s => {
        const readCount = (s.books_read || []).length;
        return readCount > 0 && readCount < s.total_books;
      });
    } else if (sortBy === "completed") {
      filtered = filtered.filter(s => {
        const readCount = (s.books_read || []).length;
        return readCount === s.total_books;
      });
    }

    return filtered;
  }, [mySeries, searchQuery, sortBy]);

  // Add series mutation
  const addSeriesMutation = useMutation({
    mutationFn: async (seriesData) => {
      await base44.entities.BookSeries.create(seriesData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookSeries'] });
      toast.success("✅ Série ajoutée !");
      setShowAddDialog(false);
      setNewSeries({
        series_name: "",
        author: "",
        total_books: "",
        cover_url: "",
        description: ""
      });
    },
    onError: (error) => {
      console.error("Error adding series:", error);
      toast.error("Erreur lors de l'ajout de la série.");
    }
  });

  // Update series mutation
  const updateSeriesMutation = useMutation({
    mutationFn: async ({ seriesId, updates }) => {
      await base44.entities.BookSeries.update(seriesId, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookSeries'] });
      toast.success("✅ Série mise à jour !");
    },
    onError: (error) => {
      console.error("Error updating series:", error);
      toast.error("Erreur lors de la mise à jour.");
    }
  });

  // Delete series mutation
  const deleteSeriesMutation = useMutation({
    mutationFn: async (seriesId) => {
      await base44.entities.BookSeries.delete(seriesId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookSeries'] });
      toast.success("Série supprimée");
      setSelectedSeries(null);
    },
    onError: (error) => {
      console.error("Error deleting series:", error);
      toast.error("Erreur lors de la suppression.");
    }
  });

  const handleAddSeries = () => {
    if (!newSeries.series_name || !newSeries.total_books) {
      toast.error("Veuillez remplir les champs obligatoires");
      return;
    }

    addSeriesMutation.mutate({
      ...newSeries,
      total_books: parseInt(newSeries.total_books, 10),
      books_read: [],
      books_in_pal: [],
      books_wishlist: []
    });
  };

  if (selectedSeries) {
    return <SeriesDetailView 
      series={selectedSeries} 
      allBooks={allBooks}
      myBooks={myBooks}
      onBack={() => setSelectedSeries(null)}
      onUpdate={(updates) => updateSeriesMutation.mutate({ seriesId: selectedSeries.id, updates })}
      onDelete={() => {
        if (window.confirm(`Êtes-vous sûre de vouloir supprimer "${selectedSeries.series_name}" ?`)) {
          deleteSeriesMutation.mutate(selectedSeries.id);
        }
      }}
    />;
  }

  return (
    <div className="p-4 md:p-8 min-h-screen" style={{ backgroundColor: 'var(--cream)' }}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-md"
                 style={{ background: 'linear-gradient(135deg, var(--lavender), var(--soft-pink))' }}>
              <BookOpen className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold" style={{ color: 'var(--dark-text)' }}>
                🌿 Séries à compléter
              </h1>
              <p className="text-lg" style={{ color: 'var(--warm-pink)' }}>
                Suivez vos sagas, tomes lus et à venir
              </p>
            </div>
          </div>
          <Button
            onClick={() => setShowAddDialog(true)}
            className="shadow-lg text-white font-medium px-6 rounded-xl"
            style={{ background: 'linear-gradient(135deg, var(--lavender), var(--soft-pink))' }}
          >
            <Plus className="w-5 h-5 mr-2" />
            Ajouter une série
          </Button>
        </div>

        {/* Legend */}
        <Card className="mb-6 border-0 shadow-md" style={{ backgroundColor: 'white' }}>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-6 items-center justify-center text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#93C5FD' }} />
                <span style={{ color: 'var(--dark-text)' }}>🔵 À acheter</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#E5E7EB' }} />
                <span style={{ color: 'var(--dark-text)' }}>⚪ Non lu</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#FCD34D' }} />
                <span style={{ color: 'var(--dark-text)' }}>📖 En cours</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#A78BFA' }} />
                <span style={{ color: 'var(--dark-text)' }}>🔷 Lu</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="border-0 shadow-md" style={{ backgroundColor: 'white' }}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2" style={{ color: 'var(--warm-pink)' }}>
                <TrendingUp className="w-4 h-4" />
                En cours
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold" style={{ color: 'var(--lavender)' }}>
                {seriesStats.inProgress}
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md" style={{ backgroundColor: 'white' }}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2" style={{ color: 'var(--warm-pink)' }}>
                <Check className="w-4 h-4" />
                Complètes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold" style={{ color: 'var(--lavender)' }}>
                {seriesStats.completed}
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md" style={{ backgroundColor: 'white' }}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2" style={{ color: 'var(--warm-pink)' }}>
                <ShoppingCart className="w-4 h-4" />
                À acheter
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold" style={{ color: 'var(--lavender)' }}>
                {seriesStats.toBuy}
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md" style={{ backgroundColor: 'white' }}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2" style={{ color: 'var(--warm-pink)' }}>
                <Sparkles className="w-4 h-4" />
                Progression
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold" style={{ color: 'var(--lavender)' }}>
                {seriesStats.avgProgress}%
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5"
                    style={{ color: 'var(--warm-pink)' }} />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher une série..."
              className="pl-12 border-2"
              style={{ borderColor: 'var(--beige)' }}
            />
          </div>
          <div className="flex gap-2">
            {["all", "in_progress", "completed"].map((filter) => (
              <Button
                key={filter}
                variant={sortBy === filter ? "default" : "outline"}
                onClick={() => setSortBy(filter)}
                style={sortBy === filter ? {
                  background: 'linear-gradient(135deg, var(--lavender), var(--soft-pink))',
                  color: 'white'
                } : { borderColor: 'var(--beige)', color: 'var(--dark-text)' }}
              >
                {filter === "all" ? "Toutes" : filter === "in_progress" ? "En cours" : "Complètes"}
              </Button>
            ))}
          </div>
        </div>

        {/* Series List */}
        {filteredSeries.length === 0 ? (
          <div className="text-center py-20">
            <BookOpen className="w-20 h-20 mx-auto mb-6 opacity-20" style={{ color: 'var(--warm-pink)' }} />
            <h3 className="text-2xl font-bold mb-2" style={{ color: 'var(--dark-text)' }}>
              {searchQuery ? "Aucune série trouvée" : "Aucune série ajoutée"}
            </h3>
            <p className="text-lg mb-6" style={{ color: 'var(--warm-pink)' }}>
              {searchQuery ? "Essayez un autre terme de recherche" : "Créez votre première série pour commencer le suivi"}
            </p>
            {!searchQuery && (
              <Button
                onClick={() => setShowAddDialog(true)}
                className="text-white font-medium"
                style={{ background: 'linear-gradient(135deg, var(--lavender), var(--soft-pink))' }}
              >
                <Plus className="w-5 h-5 mr-2" />
                Ajouter une série
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredSeries.map((series) => {
              const readCount = (series.books_read || []).length;
              const progressPercent = (readCount / series.total_books) * 100;
              const isCompleted = readCount === series.total_books;

              // Generate tome dots (max 20 visible)
              const visibleTomes = Math.min(series.total_books, 20);
              const tomes = Array.from({ length: visibleTomes }, (_, i) => {
                // Mock book IDs - in real scenario, these would come from reading_order
                const bookId = series.reading_order?.[i]?.book_id;
                const status = bookId ? getBookStatusColor(bookId, myBooks) : { color: '#93C5FD', icon: '🔵', label: 'À acheter' };
                return { index: i, status, bookId };
              });

              return (
                <Card
                  key={series.id}
                  className="border-0 shadow-lg hover:shadow-xl transition-all cursor-pointer"
                  style={{ backgroundColor: 'white' }}
                  onClick={() => setSelectedSeries(series)}
                >
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row gap-6">
                      {/* Series Cover */}
                      <div className="w-24 h-36 rounded-lg overflow-hidden shadow-md flex-shrink-0"
                           style={{ backgroundColor: 'var(--beige)' }}>
                        {series.cover_url ? (
                          <img src={series.cover_url} alt={series.series_name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <BookOpen className="w-12 h-12" style={{ color: 'var(--warm-pink)' }} />
                          </div>
                        )}
                      </div>

                      {/* Series Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-xl font-bold mb-1 line-clamp-1" style={{ color: 'var(--dark-text)' }}>
                              {series.series_name}
                            </h3>
                            {series.author && (
                              <p className="text-sm mb-3" style={{ color: 'var(--warm-pink)' }}>
                                {series.author}
                              </p>
                            )}
                          </div>
                          {isCompleted && (
                            <div className="flex items-center gap-1 px-3 py-1 rounded-full text-sm font-bold text-white"
                                 style={{ backgroundColor: 'var(--lavender)' }}>
                              <Check className="w-4 h-4" />
                              Complète
                            </div>
                          )}
                        </div>

                        {/* Tome dots */}
                        <div className="flex flex-wrap gap-2 mb-3">
                          {tomes.map((tome) => (
                            <div
                              key={tome.index}
                              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-sm transition-transform hover:scale-110"
                              style={{
                                backgroundColor: tome.status.color,
                                color: tome.status.color === '#E5E7EB' ? '#000' : '#fff'
                              }}
                              title={`Tome ${tome.index + 1} - ${tome.status.label}`}
                            >
                              {tome.index + 1}
                            </div>
                          ))}
                          {series.total_books > 20 && (
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                                 style={{ backgroundColor: 'var(--cream)', color: 'var(--dark-text)' }}>
                              +{series.total_books - 20}
                            </div>
                          )}
                        </div>

                        {/* Progress Bar */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span style={{ color: 'var(--dark-text)' }}>
                              {readCount} / {series.total_books} tomes lus
                            </span>
                            <span className="font-bold" style={{ color: 'var(--lavender)' }}>
                              {progressPercent.toFixed(0)}%
                            </span>
                          </div>
                          <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--beige)' }}>
                            <div
                              className="h-full transition-all duration-500"
                              style={{
                                width: `${progressPercent}%`,
                                background: 'linear-gradient(90deg, var(--lavender), var(--soft-pink))'
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Add Series Dialog */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent className="max-w-md bg-white border border-neutral-200 rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-neutral-900">
                Ajouter une série
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="series-name">Nom de la série *</Label>
                <Input
                  id="series-name"
                  value={newSeries.series_name}
                  onChange={(e) => setNewSeries({ ...newSeries, series_name: e.target.value })}
                  placeholder="ex: A Court of Thorns and Roses"
                />
              </div>

              <div>
                <Label htmlFor="author">Auteur</Label>
                <Input
                  id="author"
                  value={newSeries.author}
                  onChange={(e) => setNewSeries({ ...newSeries, author: e.target.value })}
                  placeholder="ex: Sarah J. Maas"
                />
              </div>

              <div>
                <Label htmlFor="total-books">Nombre total de tomes *</Label>
                <Input
                  id="total-books"
                  type="number"
                  min="1"
                  value={newSeries.total_books}
                  onChange={(e) => setNewSeries({ ...newSeries, total_books: e.target.value })}
                  placeholder="ex: 5"
                />
              </div>

              <div>
                <Label htmlFor="cover">URL de la couverture (optionnel)</Label>
                <Input
                  id="cover"
                  value={newSeries.cover_url}
                  onChange={(e) => setNewSeries({ ...newSeries, cover_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>

              <div>
                <Label htmlFor="description">Description (optionnel)</Label>
                <Textarea
                  id="description"
                  value={newSeries.description}
                  onChange={(e) => setNewSeries({ ...newSeries, description: e.target.value })}
                  placeholder="Description de la série..."
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddDialog(false);
                  setNewSeries({
                    series_name: "",
                    author: "",
                    total_books: "",
                    cover_url: "",
                    description: ""
                  });
                }}
              >
                Annuler
              </Button>
              <Button
                onClick={handleAddSeries}
                disabled={addSeriesMutation.isPending || !newSeries.series_name || !newSeries.total_books}
                className="text-white"
                style={{ background: 'linear-gradient(135deg, var(--lavender), var(--soft-pink))' }}
              >
                {addSeriesMutation.isPending ? "Ajout..." : "Ajouter"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

// Series Detail View Component
function SeriesDetailView({ series, allBooks, myBooks, onBack, onUpdate, onDelete }) {
  const [editMode, setEditMode] = useState(false);
  const [editedSeries, setEditedSeries] = useState({ ...series });

  const readCount = (series.books_read || []).length;
  const progressPercent = (readCount / series.total_books) * 100;
  const isCompleted = readCount === series.total_books;

  // Generate all tomes
  const tomes = Array.from({ length: series.total_books }, (_, i) => {
    const bookId = series.reading_order?.[i]?.book_id;
    const status = bookId ? getBookStatusColor(bookId, myBooks) : { color: '#93C5FD', icon: '🔵', label: 'À acheter' };
    const book = bookId ? allBooks.find(b => b.id === bookId) : null;
    const title = series.reading_order?.[i]?.title || `Tome ${i + 1}`;
    
    return { index: i, status, bookId, book, title };
  });

  const handleSave = () => {
    onUpdate({
      series_name: editedSeries.series_name,
      author: editedSeries.author,
      total_books: parseInt(editedSeries.total_books, 10),
      cover_url: editedSeries.cover_url,
      description: editedSeries.description
    });
    setEditMode(false);
  };

  return (
    <div className="p-4 md:p-8 min-h-screen" style={{ backgroundColor: 'var(--cream)' }}>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            onClick={onBack}
            className="p-2"
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>
          <div className="flex-1">
            {editMode ? (
              <Input
                value={editedSeries.series_name}
                onChange={(e) => setEditedSeries({ ...editedSeries, series_name: e.target.value })}
                className="text-3xl font-bold"
              />
            ) : (
              <h1 className="text-3xl md:text-4xl font-bold" style={{ color: 'var(--dark-text)' }}>
                {series.series_name}
              </h1>
            )}
            {!editMode && series.author && (
              <p className="text-lg mt-1" style={{ color: 'var(--warm-pink)' }}>
                {series.author}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            {editMode ? (
              <>
                <Button onClick={handleSave} className="text-white" style={{ background: 'var(--lavender)' }}>
                  Sauvegarder
                </Button>
                <Button variant="outline" onClick={() => {
                  setEditMode(false);
                  setEditedSeries({ ...series });
                }}>
                  Annuler
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setEditMode(true)}>
                  Modifier
                </Button>
                <Button variant="outline" onClick={onDelete} style={{ color: '#ef4444', borderColor: '#ef4444' }}>
                  Supprimer
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Progress Section */}
        <Card className="mb-8 border-0 shadow-lg" style={{ backgroundColor: 'white' }}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm mb-2" style={{ color: 'var(--warm-pink)' }}>Progression globale</p>
                <p className="text-4xl font-bold" style={{ color: 'var(--lavender)' }}>
                  {progressPercent.toFixed(0)}%
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold" style={{ color: 'var(--dark-text)' }}>
                  {readCount} / {series.total_books}
                </p>
                <p className="text-sm" style={{ color: 'var(--warm-pink)' }}>tomes lus</p>
              </div>
            </div>
            <div className="w-full h-3 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--beige)' }}>
              <div
                className="h-full transition-all duration-500"
                style={{
                  width: `${progressPercent}%`,
                  background: 'linear-gradient(90deg, var(--lavender), var(--soft-pink))'
                }}
              />
            </div>
            {isCompleted && (
              <div className="mt-4 p-4 rounded-xl text-center" style={{ backgroundColor: 'var(--cream)' }}>
                <Sparkles className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--lavender)' }} />
                <p className="font-bold text-lg" style={{ color: 'var(--dark-text)' }}>
                  🎉 Série complète !
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tomes Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {tomes.map((tome) => (
            <Card
              key={tome.index}
              className="border-2 shadow-lg hover:shadow-xl transition-all"
              style={{
                backgroundColor: 'white',
                borderColor: tome.status.color
              }}
            >
              <CardContent className="p-4">
                <div className="aspect-[2/3] rounded-lg overflow-hidden mb-3 shadow-md"
                     style={{ backgroundColor: 'var(--beige)' }}>
                  {tome.book?.cover_url ? (
                    <img src={tome.book.cover_url} alt={tome.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl font-bold"
                         style={{ color: tome.status.color }}>
                      {tome.index + 1}
                    </div>
                  )}
                </div>
                <h4 className="font-bold text-sm mb-2 line-clamp-2" style={{ color: 'var(--dark-text)' }}>
                  {tome.title}
                </h4>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: tome.status.color }} />
                  <span className="text-xs font-medium" style={{ color: 'var(--warm-pink)' }}>
                    {tome.status.label}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {series.description && !editMode && (
          <Card className="mt-8 border-0 shadow-lg" style={{ backgroundColor: 'white' }}>
            <CardHeader>
              <CardTitle style={{ color: 'var(--dark-text)' }}>À propos de la série</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--warm-pink)' }}>
                {series.description}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}