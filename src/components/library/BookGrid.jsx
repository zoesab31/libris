
import React, { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Library, Star, ArrowUpDown, Trash2, X, Check, Grid3x3, Layers, Calendar, Search } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import BookDetailsDialog from "./BookDetailsDialog";
import { toast } from "sonner";

const STATUSES = ["Lu", "En cours", "À lire", "Abandonné", "Wishlist"];

export default function BookGrid({
  userBooks,
  allBooks,
  customShelves,
  isLoading,
  selectionMode,
  selectedBooks,
  onSelectionChange,
  onExitSelectionMode,
  showPALSelector,
  readingLists,
  palMode,
  onRemoveFromPAL
}) {
  const [sortBy, setSortBy] = useState("recent");
  const [selectedUserBook, setSelectedUserBook] = useState(null);
  const [showBatchStatusDialog, setShowBatchStatusDialog] = useState(false);
  const [showBatchPALDialog, setShowBatchPALDialog] = useState(false);
  const [showBatchSeriesDialog, setShowBatchSeriesDialog] = useState(false);
  const [batchStatus, setBatchStatus] = useState("");
  const [batchPAL, setBatchPAL] = useState("");
  const [batchSeries, setBatchSeries] = useState("");
  const [seriesSearchQuery, setSeriesSearchQuery] = useState("");
  const [showSeriesSuggestions, setShowSeriesSuggestions] = useState(false);
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
  });

  const { data: bookSeries = [] } = useQuery({
    queryKey: ['bookSeries', user?.email],
    queryFn: () => base44.entities.BookSeries.filter({ created_by: user?.email }),
    enabled: !!user,
  });

  // Filter series based on search
  const filteredSeries = useMemo(() => {
    if (!seriesSearchQuery.trim()) return bookSeries;
    
    const query = seriesSearchQuery.toLowerCase();
    return bookSeries.filter(series =>
      series.series_name.toLowerCase().includes(query) ||
      series.author?.toLowerCase().includes(query)
    );
  }, [bookSeries, seriesSearchQuery]);

  const sortedBooks = useMemo(() => {
    const sorted = [...userBooks];
    
    // First, separate "En cours" books from others
    const enCoursBooks = sorted.filter(b => b.status === "En cours");
    const otherBooks = sorted.filter(b => b.status !== "En cours");
    
    // Sort "En cours" books
    let sortedEnCours = enCoursBooks;
    switch (sortBy) {
      case "recent":
        sortedEnCours = enCoursBooks.sort((a, b) => {
          const dateA = a.updated_date || a.created_date || "";
          const dateB = b.updated_date || b.created_date || "";
          return dateB.localeCompare(dateA);
        });
        break;
      case "rating":
        sortedEnCours = enCoursBooks.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case "title":
        sortedEnCours = enCoursBooks.sort((a, b) => {
          const bookA = allBooks.find(book => book.id === a.book_id);
          const bookB = allBooks.find(book => book.id === b.book_id);
          return (bookA?.title || "").localeCompare(bookB?.title || "");
        });
        break;
      default:
        break;
    }
    
    // Sort other books
    let sortedOthers = otherBooks;
    switch (sortBy) {
      case "recent":
        sortedOthers = otherBooks.sort((a, b) => {
          const dateA = a.updated_date || a.created_date || "";
          const dateB = b.updated_date || b.created_date || "";
          return dateB.localeCompare(dateA);
        });
        break;
      case "rating":
        sortedOthers = otherBooks.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case "title":
        sortedOthers = otherBooks.sort((a, b) => {
          const bookA = allBooks.find(book => book.id === a.book_id);
          const bookB = allBooks.find(book => book.id === b.book_id);
          return (bookA?.title || "").localeCompare(bookB?.title || "");
        });
        break;
      default:
        break;
    }
    
    // Return "En cours" books first, then others
    return [...sortedEnCours, ...sortedOthers];
  }, [userBooks, sortBy, allBooks]);

  const getBookDetails = (userBook) => {
    return allBooks.find(b => b.id === userBook.book_id);
  };

  // Get shelf info for a book
  const getShelfInfo = (userBook) => {
    if (!userBook.custom_shelf) return null;
    return customShelves.find(s => s.name === userBook.custom_shelf);
  };

  const handleBookClick = (userBook) => {
    if (selectionMode) {
      // Toggle selection
      const isSelected = selectedBooks.includes(userBook.id);
      if (isSelected) {
        onSelectionChange(selectedBooks.filter(id => id !== userBook.id));
      } else {
        onSelectionChange([...selectedBooks, userBook.id]);
      }
    } else {
      // Open details
      setSelectedUserBook(userBook);
    }
  };

  const deleteBooksMutation = useMutation({
    mutationFn: async (bookIds) => {
      await Promise.all(bookIds.map(id => base44.entities.UserBook.delete(id)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myBooks'] });
      onSelectionChange([]);
      onExitSelectionMode();
      toast.success("✅ Livres supprimés !");
    },
  });

  const batchUpdateStatusMutation = useMutation({
    mutationFn: async ({ bookIds, status }) => {
      await Promise.all(
        bookIds.map(id => base44.entities.UserBook.update(id, { status }))
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myBooks'] });
      setShowBatchStatusDialog(false);
      setBatchStatus("");
      toast.success("✅ Statut mis à jour !");
    },
  });

  const batchAddToPALMutation = useMutation({
    mutationFn: async ({ bookIds, palId }) => {
      const pal = readingLists.find(p => p.id === palId);
      if (!pal) return;

      const userBooksToAdd = userBooks.filter(ub => bookIds.includes(ub.id));
      const bookIdsToAdd = userBooksToAdd.map(ub => ub.book_id);
      const updatedBookIds = [...new Set([...(pal.book_ids || []), ...bookIdsToAdd])];

      await base44.entities.ReadingList.update(palId, { book_ids: updatedBookIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['readingLists'] });
      setShowBatchPALDialog(false);
      setBatchPAL("");
      toast.success("✅ Livres ajoutés à la PAL !");
    },
  });

  const batchAddToSeriesMutation = useMutation({
    mutationFn: async ({ bookIds, seriesId }) => {
      const series = bookSeries.find(s => s.id === seriesId);
      if (!series) return;

      const userBooksToAdd = userBooks.filter(ub => bookIds.includes(ub.id));

      let updatedBooksRead = [...(series.books_read || [])];
      let updatedBooksInPal = [...(series.books_in_pal || [])];
      let updatedBooksWishlist = [...(series.books_wishlist || [])];

      userBooksToAdd.forEach(ub => {
        const bookId = ub.book_id;
        
        // Remove from all lists first
        updatedBooksRead = updatedBooksRead.filter(id => id !== bookId);
        updatedBooksInPal = updatedBooksInPal.filter(id => id !== bookId);
        updatedBooksWishlist = updatedBooksWishlist.filter(id => id !== bookId);

        // Add to correct list based on status
        if (ub.status === "Lu") {
          updatedBooksRead.push(bookId);
        } else if (ub.status === "À lire") {
          updatedBooksInPal.push(bookId);
        } else {
          updatedBooksWishlist.push(bookId);
        }
      });

      await base44.entities.BookSeries.update(seriesId, {
        books_read: [...new Set(updatedBooksRead)],
        books_in_pal: [...new Set(updatedBooksInPal)],
        books_wishlist: [...new Set(updatedBooksWishlist)],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookSeries'] });
      setShowBatchSeriesDialog(false);
      setBatchSeries("");
      setSeriesSearchQuery("");
      toast.success("✅ Livres ajoutés à la saga !");
    },
  });

  const handleBatchDelete = () => {
    if (window.confirm(`Supprimer ${selectedBooks.length} livre${selectedBooks.length > 1 ? 's' : ''} ?`)) {
      deleteBooksMutation.mutate(selectedBooks);
    }
  };

  const handleBatchStatusChange = () => {
    if (!batchStatus) {
      toast.error("Veuillez sélectionner un statut");
      return;
    }
    batchUpdateStatusMutation.mutate({ bookIds: selectedBooks, status: batchStatus });
  };

  const handleBatchAddToPAL = () => {
    if (!batchPAL) {
      toast.error("Veuillez sélectionner une PAL");
      return;
    }
    batchAddToPALMutation.mutate({ bookIds: selectedBooks, palId: batchPAL });
  };

  const handleBatchAddToSeries = () => {
    if (!batchSeries) {
      toast.error("Veuillez sélectionner une saga");
      return;
    }
    batchAddToSeriesMutation.mutate({ bookIds: selectedBooks, seriesId: batchSeries });
  };

  const handleSelectSeries = (series) => {
    setBatchSeries(series.id);
    setSeriesSearchQuery(series.series_name);
    setShowSeriesSuggestions(false);
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {[...Array(10)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="w-full aspect-[2/3] rounded-xl mb-3" style={{ backgroundColor: 'var(--beige)' }} />
            <div className="h-4 rounded mb-2" style={{ backgroundColor: 'var(--beige)' }} />
            <div className="h-3 rounded w-3/4" style={{ backgroundColor: 'var(--beige)' }} />
          </div>
        ))}
      </div>
    );
  }

  if (sortedBooks.length === 0) {
    return (
      <div className="text-center py-20">
        <Library className="w-20 h-20 mx-auto mb-6 opacity-20" style={{ color: 'var(--warm-pink)' }} />
        <h3 className="text-2xl font-bold mb-2" style={{ color: 'var(--dark-text)' }}>
          Aucun livre
        </h3>
        <p className="text-lg" style={{ color: 'var(--warm-pink)' }}>
          Commencez à construire votre bibliothèque
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-4 mb-6">
        <div className="flex items-center gap-2">
          <ArrowUpDown className="w-5 h-5" style={{ color: 'var(--warm-pink)' }} />
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Plus récents</SelectItem>
              <SelectItem value="rating">Mieux notés</SelectItem>
              <SelectItem value="title">Par titre</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="relative">
        {/* Main grid */}
        <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 transition-all ${
          selectionMode && selectedBooks.length > 0 ? 'mr-80' : ''
        }`}>
          {sortedBooks.map((userBook) => {
            const book = getBookDetails(userBook);
            if (!book) return null;

            const isSelected = selectedBooks.includes(userBook.id);
            const shelfInfo = getShelfInfo(userBook);

            return (
              <div key={userBook.id} className="relative group">
                <Card
                  className={`overflow-hidden cursor-pointer transition-all hover:shadow-xl hover:-translate-y-2 ${
                    isSelected ? 'ring-4 ring-pink-500' : ''
                  }`}
                  onClick={() => handleBookClick(userBook)}
                >
                  <div className="relative w-full aspect-[2/3] overflow-hidden"
                       style={{ backgroundColor: 'var(--beige)' }}>
                    {book.cover_url ? (
                      <img
                        src={book.cover_url}
                        alt={book.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Library className="w-12 h-12" style={{ color: 'var(--warm-pink)' }} />
                      </div>
                    )}

                    {/* "En cours" badge - top left, only for books with "En cours" status */}
                    {userBook.status === "En cours" && !isSelected && (
                      <div className="absolute top-2 left-2 px-3 py-1.5 rounded-lg shadow-lg z-20"
                           style={{ 
                             background: 'linear-gradient(135deg, #FF69B4, #FF1493)',
                             animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                           }}>
                        <span className="text-xs font-bold text-white uppercase tracking-wide">
                          En cours
                        </span>
                      </div>
                    )}

                    {/* Selection indicator - only shows when selected */}
                    {isSelected && (
                      <div className="absolute top-2 left-2 w-8 h-8 rounded-full flex items-center justify-center shadow-lg z-10"
                           style={{ backgroundColor: '#FF1493' }}>
                        <Check className="w-5 h-5 text-white" />
                      </div>
                    )}

                    {/* Custom shelf badge - shows below "En cours" or selection badge */}
                    {shelfInfo && (
                      <div className={`absolute ${
                        isSelected ? 'top-12 left-2' : 
                        userBook.status === "En cours" ? 'top-12 left-2' : 
                        'top-2 left-2'
                      } px-2 py-1 rounded-lg shadow-lg flex items-center gap-1 transition-all z-10`}
                           style={{ 
                             backgroundColor: shelfInfo.color === 'rose' ? '#FFB7D5' :
                                             shelfInfo.color === 'bleu' ? '#A7C7E7' :
                                             shelfInfo.color === 'vert' ? '#98D8C8' :
                                             shelfInfo.color === 'violet' ? '#E6B3E8' :
                                             shelfInfo.color === 'orange' ? '#FFB89C' :
                                             shelfInfo.color === 'rouge' ? '#FF8FAB' : '#FFB7D5'
                           }}>
                        <span className="text-sm">{shelfInfo.icon}</span>
                        <span className="text-xs font-bold text-white line-clamp-1">
                          {shelfInfo.name}
                        </span>
                      </div>
                    )}

                    {/* Rating badge - always at top right */}
                    {userBook.rating && (
                      <div className="absolute top-2 right-2 px-2 py-1 rounded-full shadow-md flex items-center gap-1"
                           style={{ backgroundColor: 'rgba(255, 215, 0, 0.95)' }}>
                        <Star className="w-3 h-3 fill-current text-white" />
                        <span className="text-xs font-bold text-white">{userBook.rating}</span>
                      </div>
                    )}
                  </div>

                  <CardContent className="p-4">
                    <h3 className="font-bold line-clamp-2 mb-1 book-title-display" 
                        style={{ color: 'var(--dark-text)' }}
                        title={book.title}>
                      {book.title}
                    </h3>
                    <p className="text-sm line-clamp-1 book-author-display" 
                       style={{ color: 'var(--warm-pink)' }}
                       title={book.author}>
                      {book.author}
                    </p>
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>

        {/* Selection sidebar */}
        {selectionMode && selectedBooks.length > 0 && (
          <div className="fixed right-0 top-0 bottom-0 w-80 bg-white shadow-2xl border-l-4 p-6 overflow-y-auto z-50"
               style={{ borderColor: '#FF1493' }}>
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-4 border-b-2"
                   style={{ borderColor: 'var(--beige)' }}>
                <div>
                  <h3 className="text-xl font-bold" style={{ color: 'var(--dark-text)' }}>
                    Sélection
                  </h3>
                  <p className="text-sm" style={{ color: 'var(--warm-pink)' }}>
                    {selectedBooks.length} livre{selectedBooks.length > 1 ? 's' : ''}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onExitSelectionMode}
                  className="rounded-full"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              {/* Actions */}
              <div className="space-y-3">
                <Button
                  onClick={() => setShowBatchStatusDialog(true)}
                  className="w-full justify-start text-white"
                  style={{ background: 'linear-gradient(135deg, #9B59B6, #E6B3E8)' }}
                >
                  <Grid3x3 className="w-5 h-5 mr-2" />
                  Changer le statut
                </Button>

                <Button
                  onClick={() => setShowBatchPALDialog(true)}
                  className="w-full justify-start text-white"
                  style={{ background: 'linear-gradient(135deg, #FF69B4, #FFB6C8)' }}
                >
                  <Calendar className="w-5 h-5 mr-2" />
                  Ajouter à une PAL
                </Button>

                <Button
                  onClick={() => setShowBatchSeriesDialog(true)}
                  className="w-full justify-start text-white"
                  style={{ background: 'linear-gradient(135deg, #E6B3E8, #FFB6C8)' }}
                >
                  <Layers className="w-5 h-5 mr-2" />
                  Ajouter à une saga
                </Button>

                <Button
                  onClick={handleBatchDelete}
                  variant="destructive"
                  className="w-full justify-start"
                >
                  <Trash2 className="w-5 h-5 mr-2" />
                  Supprimer
                </Button>
              </div>

              {/* Preview of selected books */}
              <div className="pt-4 border-t-2" style={{ borderColor: 'var(--beige)' }}>
                <p className="text-xs font-bold mb-3" style={{ color: 'var(--warm-pink)' }}>
                  LIVRES SÉLECTIONNÉS
                </p>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {selectedBooks.map(bookId => {
                    const userBook = userBooks.find(ub => ub.id === bookId);
                    const book = userBook ? getBookDetails(userBook) : null;
                    if (!book) return null;

                    return (
                      <div key={bookId} className="flex items-center gap-2 p-2 rounded-lg"
                           style={{ backgroundColor: 'var(--cream)' }}>
                        <div className="w-10 h-14 rounded overflow-hidden flex-shrink-0"
                             style={{ backgroundColor: 'var(--beige)' }}>
                          {book.cover_url && (
                            <img src={book.cover_url} alt={book.title} 
                                 className="w-full h-full object-cover" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold line-clamp-1" style={{ color: 'var(--dark-text)' }}>
                            {book.title}
                          </p>
                          <p className="text-xs line-clamp-1" style={{ color: 'var(--warm-pink)' }}>
                            {book.author}
                          </p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectionChange(selectedBooks.filter(id => id !== bookId));
                          }}
                          className="flex-shrink-0 text-red-500 hover:text-red-700"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {selectedUserBook && (
        <BookDetailsDialog
          userBook={selectedUserBook}
          book={allBooks.find(b => b.id === selectedUserBook.book_id)}
          open={!!selectedUserBook}
          onOpenChange={(open) => !open && setSelectedUserBook(null)}
        />
      )}

      {/* Batch Status Dialog */}
      <Dialog open={showBatchStatusDialog} onOpenChange={setShowBatchStatusDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Changer le statut de {selectedBooks.length} livre{selectedBooks.length > 1 ? 's' : ''}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Nouveau statut</Label>
              <Select value={batchStatus} onValueChange={setBatchStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un statut..." />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map(status => (
                    <SelectItem key={status} value={status}>{status}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleBatchStatusChange}
                disabled={!batchStatus || batchUpdateStatusMutation.isPending}
                className="flex-1 text-white"
                style={{ background: 'linear-gradient(135deg, #9B59B6, #E6B3E8)' }}
              >
                Appliquer
              </Button>
              <Button variant="outline" onClick={() => setShowBatchStatusDialog(false)}>
                Annuler
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Batch PAL Dialog */}
      <Dialog open={showBatchPALDialog} onOpenChange={setShowBatchPALDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter à une PAL</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Sélectionner une PAL</Label>
              <Select value={batchPAL} onValueChange={setBatchPAL}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir une PAL..." />
                </SelectTrigger>
                <SelectContent>
                  {readingLists?.map(pal => (
                    <SelectItem key={pal.id} value={pal.id}>
                      {pal.icon} {pal.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {readingLists?.length === 0 && (
              <p className="text-sm text-center" style={{ color: 'var(--warm-pink)' }}>
                Aucune PAL créée. Créez-en une depuis l'onglet PAL.
              </p>
            )}
            <div className="flex gap-2">
              <Button
                onClick={handleBatchAddToPAL}
                disabled={!batchPAL || batchAddToPALMutation.isPending}
                className="flex-1 text-white"
                style={{ background: 'linear-gradient(135deg, #FF69B4, #FFB6C8)' }}
              >
                Ajouter
              </Button>
              <Button variant="outline" onClick={() => setShowBatchPALDialog(false)}>
                Annuler
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Batch Series Dialog with Smart Search */}
      <Dialog open={showBatchSeriesDialog} onOpenChange={setShowBatchSeriesDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter à une saga</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="mb-2 block">Rechercher une saga</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" 
                        style={{ color: 'var(--warm-pink)' }} />
                <Input
                  value={seriesSearchQuery}
                  onChange={(e) => {
                    setSeriesSearchQuery(e.target.value);
                    setShowSeriesSuggestions(true);
                    if (!e.target.value.trim()) {
                      setBatchSeries("");
                    }
                  }}
                  onFocus={() => setShowSeriesSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSeriesSuggestions(false), 200)}
                  placeholder="Tapez le nom d'une saga..."
                  className="pl-10 focus-glow"
                />
              </div>

              {/* Suggestions dropdown */}
              {showSeriesSuggestions && seriesSearchQuery.trim() && (
                <div className="absolute z-50 w-full mt-1 bg-white rounded-xl shadow-xl border-2 max-h-64 overflow-y-auto"
                     style={{ borderColor: 'var(--beige)' }}>
                  {filteredSeries.length > 0 ? (
                    <>
                      <div className="p-2 border-b" style={{ borderColor: 'var(--beige)' }}>
                        <p className="text-xs font-bold px-2" style={{ color: 'var(--warm-pink)' }}>
                          📚 Sagas trouvées
                        </p>
                      </div>
                      {filteredSeries.map(series => (
                        <button
                          key={series.id}
                          onMouseDown={() => handleSelectSeries(series)}
                          className="w-full text-left px-4 py-3 hover:bg-pink-50 transition-colors border-b last:border-b-0"
                          style={{ borderColor: 'var(--beige)' }}
                        >
                          <p className="font-bold text-sm" style={{ color: 'var(--dark-text)' }}>
                            {series.series_name}
                          </p>
                          <p className="text-xs" style={{ color: 'var(--warm-pink)' }}>
                            {series.author} • {(series.books_read?.length || 0) + (series.books_in_pal?.length || 0) + (series.books_wishlist?.length || 0)} livre{((series.books_read?.length || 0) + (series.books_in_pal?.length || 0) + (series.books_wishlist?.length || 0)) > 1 ? 's' : ''}
                          </p>
                        </button>
                      ))}
                    </>
                  ) : (
                    <div className="p-4 text-center">
                      <p className="text-sm" style={{ color: 'var(--warm-pink)' }}>
                        Aucune saga trouvée
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Selected series preview */}
              {batchSeries && bookSeries.find(s => s.id === batchSeries) && (
                <div className="mt-3 p-4 rounded-xl" style={{ backgroundColor: '#E6B3E8' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Layers className="w-5 h-5 text-white" />
                    <span className="font-bold text-white">
                      {bookSeries.find(s => s.id === batchSeries)?.series_name}
                    </span>
                  </div>
                  <p className="text-sm text-white opacity-90">
                    {bookSeries.find(s => s.id === batchSeries)?.author} • {((bookSeries.find(s => s.id === batchSeries)?.books_read?.length || 0) + (bookSeries.find(s => s.id === batchSeries)?.books_in_pal?.length || 0) + (bookSeries.find(s => s.id === batchSeries)?.books_wishlist?.length || 0))} livre{((bookSeries.find(s => s.id === batchSeries)?.books_read?.length || 0) + (bookSeries.find(s => s.id === batchSeries)?.books_in_pal?.length || 0) + (bookSeries.find(s => s.id === batchSeries)?.books_wishlist?.length || 0)) > 1 ? 's' : ''}
                  </p>
                </div>
              )}
            </div>

            {bookSeries.length === 0 && (
              <p className="text-sm text-center" style={{ color: 'var(--warm-pink)' }}>
                Aucune saga créée. Créez-en une depuis la page Séries.
              </p>
            )}

            <div className="flex gap-2">
              <Button
                onClick={handleBatchAddToSeries}
                disabled={!batchSeries || batchAddToSeriesMutation.isPending}
                className="flex-1 text-white"
                style={{ background: 'linear-gradient(135deg, #E6B3E8, #FFB6C8)' }}
              >
                Ajouter
              </Button>
              <Button variant="outline" onClick={() => {
                setShowBatchSeriesDialog(false);
                setSeriesSearchQuery("");
                setBatchSeries("");
              }}>
                Annuler
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
