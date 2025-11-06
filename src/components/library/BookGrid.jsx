
import React, { useState } from 'react';
import { BookOpen, Star, Music, Users, Check, FolderPlus, X } from "lucide-react"; // Added X
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import BookDetailsDialog from "./BookDetailsDialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export default function BookGrid({
  userBooks,
  allBooks,
  customShelves,
  isLoading,
  selectionMode,
  selectedBooks,
  onSelectionChange,
  onExitSelectionMode,
  showPALSelector = false, // New prop
  readingLists = [],      // New prop
  palMode = null,         // New prop
  onRemoveFromPAL = null  // New prop
}) {
  const [selectedUserBook, setSelectedUserBook] = useState(null);
  const [sortBy, setSortBy] = useState("recent");
  const [showShelfDialog, setShowShelfDialog] = useState(false);
  const [selectedShelf, setSelectedShelf] = useState("");
  const [showPALDialog, setShowPALDialog] = useState(false); // New state
  const [bookToAddToPAL, setBookToAddToPAL] = useState(null); // New state
  const queryClient = useQueryClient();

  // Helper to get first author only
  const getFirstAuthor = (authorString) => {
    if (!authorString) return "Auteur inconnu";
    const authors = authorString.split(',');
    return authors[0].trim();
  };

  const deleteMultipleMutation = useMutation({
    mutationFn: async (bookIds) => {
      for (const bookId of bookIds) {
        const userBook = userBooks.find(ub => ub.id === bookId);
        if (!userBook) continue;

        const book = allBooks.find(b => b.id === userBook.book_id);
        if (!book) continue;

        // Delete associated data
        const relatedComments = await base44.entities.ReadingComment.filter({ user_book_id: userBook.id });
        await Promise.all(relatedComments.map(c => base44.entities.ReadingComment.delete(c.id)));

        // Delete user book
        await base44.entities.UserBook.delete(userBook.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myBooks'] });
      queryClient.invalidateQueries({ queryKey: ['books'] });
      queryClient.invalidateQueries({ queryKey: ['bingoChallenges'] });
      queryClient.invalidateQueries({ queryKey: ['readingPoints'] });
      queryClient.invalidateQueries({ queryKey: ['recentComments'] });
      toast.success(`${selectedBooks.length} livre${selectedBooks.length > 1 ? 's' : ''} supprimé${selectedBooks.length > 1 ? 's' : ''}`);
      onExitSelectionMode();
    },
    onError: (error) => {
      console.error("Error deleting books:", error);
      toast.error("Erreur lors de la suppression des livres.");
    }
  });

  const addToShelfMutation = useMutation({
    mutationFn: async ({ bookIds, shelfName }) => {
      const updatePromises = bookIds.map(bookId =>
        base44.entities.UserBook.update(bookId, {
          custom_shelf: shelfName || undefined
        })
      );
      await Promise.all(updatePromises);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['myBooks'] });
      const shelfName = variables.shelfName || "Aucune étagère";
      toast.success(`${selectedBooks.length} livre${selectedBooks.length > 1 ? 's' : ''} ajouté${selectedBooks.length > 1 ? 's' : ''} à "${shelfName}"`);
      setShowShelfDialog(false);
      setSelectedShelf("");
      onExitSelectionMode();
    },
    onError: (error) => {
      console.error("Error adding to shelf:", error);
      toast.error("Erreur lors de l'ajout à l'étagère");
    }
  });

  // New mutation for adding to PAL
  const addToPALMutation = useMutation({
    mutationFn: async ({ palId, bookId }) => {
      const pal = readingLists.find(p => p.id === palId);
      if (!pal) return;

      const updatedBookIds = [...(pal.book_ids || []), bookId];
      await base44.entities.ReadingList.update(palId, { book_ids: updatedBookIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['readingLists'] });
      toast.success("✅ Livre ajouté à la PAL !");
      setShowPALDialog(false);
      setBookToAddToPAL(null);
    },
    onError: (error) => {
      console.error("Error adding to PAL:", error);
      toast.error("Erreur lors de l'ajout à la PAL.");
    }
  });

  const toggleBookSelection = (bookId) => {
    if (selectedBooks.includes(bookId)) {
      onSelectionChange(selectedBooks.filter(id => id !== bookId));
    } else {
      onSelectionChange([...selectedBooks, bookId]);
    }
  };

  const handleAddToShelf = () => {
    if (selectedBooks.length === 0) return;
    setShowShelfDialog(true);
  };

  const confirmAddToShelf = () => {
    addToShelfMutation.mutate({
      bookIds: selectedBooks,
      shelfName: selectedShelf
    });
  };

  // Handle delete when selection mode and books selected - MUST BE BEFORE ANY RETURN
  React.useEffect(() => {
    if (selectionMode && selectedBooks.length > 0) {
      const handleKeyPress = (e) => {
        if (e.key === 'Delete' && selectedBooks.length > 0) {
          if (window.confirm(`Êtes-vous sûre de vouloir supprimer ${selectedBooks.length} livre${selectedBooks.length > 1 ? 's' : ''} ?`)) {
            deleteMultipleMutation.mutate(selectedBooks);
          }
        }
      };
      window.addEventListener('keydown', handleKeyPress);
      return () => window.removeEventListener('keydown', handleKeyPress);
    }
  }, [selectionMode, selectedBooks, deleteMultipleMutation]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {Array(10).fill(0).map((_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="w-full aspect-[2/3] rounded-xl" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (userBooks.length === 0) {
    return (
      <div className="text-center py-20">
        <BookOpen className="w-20 h-20 mx-auto mb-6 opacity-20" style={{ color: 'var(--warm-pink)' }} />
        <h3 className="text-2xl font-bold mb-2" style={{ color: 'var(--dark-text)' }}>
          Aucun livre ici
        </h3>
        <p className="text-lg" style={{ color: 'var(--warm-pink)' }}>
          Ajoutez votre premier livre pour commencer votre collection
        </p>
      </div>
    );
  }

  // Sort books
  const sortedBooks = [...userBooks].sort((a, b) => {
    const bookA = allBooks.find(book => book.id === a.book_id);
    const bookB = allBooks.find(book => book.id === b.book_id);

    if (a.status === "En cours" && b.status !== "En cours") return -1;
    if (b.status === "En cours" && a.status !== "En cours") return 1;

    if (a.status === "À lire" && b.status === "À lire") {
      const aIsServicePress = bookA?.tags?.includes("Service Press");
      const bIsServicePress = bookB?.tags?.includes("Service Press");
      if (aIsServicePress && !bIsServicePress) return -1;
      if (!aIsServicePress && bIsServicePress) return 1;
    }

    if (sortBy === "rating") {
      return (b.rating || 0) - (a.rating || 0);
    } else if (sortBy === "title") {
      return (bookA?.title || "").localeCompare(bookB?.title || "");
    }
    return new Date(b.updated_date) - new Date(a.updated_date);
  });

  return (
    <>
      {!selectionMode && (
        <div className="mb-4 flex justify-end">
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Trier par" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Plus récents</SelectItem>
              <SelectItem value="rating">Note (meilleure d'abord)</SelectItem>
              <SelectItem value="title">Titre (A-Z)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {selectionMode && selectedBooks.length > 0 && (
        <div className="mb-4 p-4 rounded-xl flex items-center justify-between flex-wrap gap-3"
             style={{ backgroundColor: 'var(--soft-pink)', color: 'white' }}>
          <span className="font-bold">
            {selectedBooks.length} livre{selectedBooks.length > 1 ? 's' : ''} sélectionné{selectedBooks.length > 1 ? 's' : ''}
          </span>
          <div className="flex gap-2">
            <button
              onClick={handleAddToShelf}
              disabled={addToShelfMutation.isPending}
              className="px-4 py-2 rounded-lg font-medium transition-all hover:bg-white hover:text-pink-600 flex items-center gap-2"
              style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }}
            >
              <FolderPlus className="w-4 h-4" />
              Ajouter à une étagère
            </button>
            <button
              onClick={() => {
                if (window.confirm(`Êtes-vous sûre de vouloir supprimer ${selectedBooks.length} livre${selectedBooks.length > 1 ? 's' : ''} ?`)) {
                  deleteMultipleMutation.mutate(selectedBooks);
                }
              }}
              disabled={deleteMultipleMutation.isPending}
              className="px-4 py-2 rounded-lg font-medium transition-all hover:bg-white hover:text-pink-600"
              style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }}
            >
              {deleteMultipleMutation.isPending ? "Suppression..." : "Supprimer"}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
        {sortedBooks.map((userBook) => { // Changed to sortedBooks.map
          const book = allBooks.find(b => b.id === userBook.book_id);
          if (!book) return null;

          const shelf = customShelves.find(s => s.name === userBook.custom_shelf);
          const isCurrentlyReading = userBook.status === "En cours";
          const isServicePress = book.tags?.includes("Service Press");
          const isSelected = selectedBooks.includes(userBook.id);

          return (
            <div
              key={userBook.id}
              className={`group cursor-pointer relative ${
                selectionMode && isSelected ? 'ring-4 ring-pink-500' : ''
              }`}
            >
              {selectionMode && (
                <div
                  onClick={(e) => { // Added stopPropagation
                    e.stopPropagation();
                    toggleBookSelection(userBook.id);
                  }}
                  className="absolute -top-2 -left-2 w-6 h-6 rounded-full border-2 flex items-center justify-center z-20 bg-white"
                  style={{
                    borderColor: isSelected ? 'var(--deep-pink)' : 'var(--beige)',
                    backgroundColor: isSelected ? 'var(--deep-pink)' : 'white'
                  }}
                >
                  {isSelected && <Check className="w-4 h-4 text-white" />}
                </div>
              )}

              {palMode && onRemoveFromPAL && ( // New PAL remove button
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveFromPAL(userBook.book_id);
                  }}
                  className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg z-20 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-4 h-4" />
                </button>
              )}

              <div
                // Click handler for opening BookDetailsDialog
                onClick={() => {
                  // Only open details if not in selection mode or PAL mode
                  if (!selectionMode && !palMode && !showPALSelector) {
                    setSelectedUserBook(userBook);
                  }
                }}
                className="relative mb-3 w-full aspect-[2/3] rounded-xl overflow-hidden shadow-lg
                              transition-all duration-300 group-hover:shadow-2xl group-hover:-translate-y-2"
                style={{ backgroundColor: 'var(--beige)' }}
              >
                {isCurrentlyReading && (
                  <div className="absolute -top-2 -left-2 z-10 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg animate-pulse">
                    En cours
                  </div>
                )}

                {isServicePress && userBook.status === "À lire" && !isCurrentlyReading && (
                  <div className="absolute -top-2 -left-2 z-10 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg"
                       style={{ background: 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))' }}>
                    📬 Service Press
                  </div>
                )}

                <div className="w-full h-full"> {/* Inner div for cover */}
                  {book.cover_url ? (
                    <img
                      src={book.cover_url}
                      alt={book.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BookOpen className="w-12 h-12" style={{ color: 'var(--warm-pink)' }} /> {/* Changed color */}
                    </div>
                  )}
                </div>

                <div className="absolute top-2 right-2 flex flex-col gap-2">
                  {userBook.is_shared_reading && (
                    <div className="bg-white/95 backdrop-blur-sm rounded-full p-2 shadow-md">
                      <Users className="w-4 h-4" style={{ color: 'var(--warm-brown)' }} />
                    </div>
                  )}
                  {userBook.music && (
                    <div className="bg-white/95 backdrop-blur-sm rounded-full p-2 shadow-md">
                      <Music className="w-4 h-4" style={{ color: 'var(--warm-brown)' }} />
                    </div>
                  )}
                  {userBook.rating && (
                    <div className="bg-white/95 backdrop-blur-sm rounded-full px-2 py-1 shadow-md
                                  flex items-center gap-1">
                      <Star className="w-3 h-3 fill-current" style={{ color: 'var(--gold)' }} />
                      <span className="text-xs font-bold" style={{ color: 'var(--deep-brown)' }}>
                        {userBook.rating}
                      </span>
                    </div>
                  )}
                </div>

                {shelf && (
                  <div className="absolute bottom-2 left-2 right-2">
                    <div className="bg-white/95 backdrop-blur-sm rounded-lg px-2 py-1 text-xs font-medium text-center"
                         style={{ color: 'var(--deep-brown)' }}>
                      {shelf.icon} {shelf.name}
                    </div>
                  </div>
                )}
              </div>

              <h3 
                className="font-bold mt-2 mb-1 group-hover:underline book-title-display" 
                style={{ 
                  color: 'var(--dark-text)',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  overflowWrap: 'anywhere',
                  wordBreak: 'break-word',
                  fontSize: 'clamp(13px, 2.2vw, 15px)',
                  lineHeight: '1.25',
                  minHeight: '2.5em'
                }}
                title={book.title}
              >
                {book.title}
              </h3>
              <p 
                className="mb-1 book-author-display" 
                style={{ 
                  color: 'var(--warm-pink)',
                  overflowWrap: 'anywhere',
                  whiteSpace: 'normal',
                  fontSize: 'clamp(11px, 1.8vw, 13px)',
                  lineHeight: '1.2',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  minHeight: '1.4em'
                }}
                title={book.author}
              >
                {getFirstAuthor(book.author)}
              </p>

              {book.genre && (
                <p className="text-xs mt-1" style={{ color: 'var(--soft-brown)' }}>
                  {book.genre}
                </p>
              )}

              {showPALSelector && !palMode && ( // New "Add to PAL" button
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    setBookToAddToPAL(userBook.id);
                    setShowPALDialog(true);
                  }}
                  className="w-full mt-2 text-xs"
                  style={{ borderColor: 'var(--beige)', color: 'var(--deep-pink)' }}
                >
                  Ajouter à une PAL
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {selectedUserBook && !selectionMode && ( // Added !selectionMode condition
        <BookDetailsDialog
          userBook={selectedUserBook}
          book={allBooks.find(b => b.id === selectedUserBook.book_id)}
          open={!!selectedUserBook}
          onOpenChange={(open) => !open && setSelectedUserBook(null)}
        />
      )}

      {/* Add to Shelf Dialog */}
      <Dialog open={showShelfDialog} onOpenChange={setShowShelfDialog}>
        <DialogContent className="bg-white border border-neutral-200 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-neutral-900 flex items-center gap-2">
              <FolderPlus className="w-6 h-6" style={{ color: 'var(--deep-pink)' }} />
              Ajouter à une étagère
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <p className="text-sm text-neutral-600">
              Sélectionnez l'étagère où ajouter {selectedBooks.length} livre{selectedBooks.length > 1 ? 's' : ''}
            </p>

            <div>
              <Label htmlFor="shelf-select">Étagère</Label>
              <Select value={selectedShelf} onValueChange={setSelectedShelf}>
                <SelectTrigger id="shelf-select">
                  <SelectValue placeholder="Choisir une étagère..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Aucune étagère</SelectItem> {/* Use empty string for consistency */}
                  {customShelves.map(shelf => (
                    <SelectItem key={shelf.id} value={shelf.name}>
                      {shelf.icon} {shelf.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {customShelves.length === 0 && (
              <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--cream)' }}>
                <p className="text-sm" style={{ color: 'var(--warm-pink)' }}>
                  💡 Vous n'avez pas encore d'étagère personnalisée. Créez-en une depuis le bouton "Gérer mes étagères" !
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowShelfDialog(false);
                setSelectedShelf("");
              }}
            >
              Annuler
            </Button>
            <Button
              onClick={confirmAddToShelf}
              disabled={addToShelfMutation.isPending}
              className="text-white"
              style={{ background: 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))' }}
            >
              {addToShelfMutation.isPending ? (
                <>Ajout...</>
              ) : (
                <>Confirmer</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PAL Selection Dialog */}
      <Dialog open={showPALDialog} onOpenChange={setShowPALDialog}>
        <DialogContent className="bg-white border border-neutral-200 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-neutral-900">
              Ajouter à une PAL
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {readingLists.length > 0 ? (
              readingLists.map((pal) => (
                <Button
                  key={pal.id}
                  variant="outline"
                  className="w-full justify-start text-neutral-700 hover:bg-neutral-100"
                  onClick={() => addToPALMutation.mutate({ palId: pal.id, bookId: bookToAddToPAL })}
                  disabled={pal.book_ids?.includes(bookToAddToPAL) || addToPALMutation.isPending}
                >
                  <span className="flex items-center gap-2">
                    {pal.icon} {pal.name}
                  </span>
                  {pal.book_ids?.includes(bookToAddToPAL) && " (déjà ajouté)"}
                </Button>
              ))
            ) : (
              <p className="text-center py-4" style={{ color: 'var(--warm-brown)' }}>
                Aucune PAL créée. Créez-en une d'abord !
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPALDialog(false)}>
              Annuler
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
