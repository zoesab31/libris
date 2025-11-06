
import React, { useState, useMemo, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, X, Search, Loader2, BookOpen } from "lucide-react";
import { toast } from "sonner";

export default function AddSeriesDialog({ open, onOpenChange, user, editSeries = null }) {
  const [seriesName, setSeriesName] = useState("");
  const [author, setAuthor] = useState("");
  const [totalBooks, setTotalBooks] = useState("");
  const [description, setDescription] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [readingOrder, setReadingOrder] = useState([{ order: 1, title: "", bookId: null }]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeOrderIndex, setActiveOrderIndex] = useState(null);
  const [isSearchingOnline, setIsSearchingOnline] = useState(false);
  const [onlineResults, setOnlineResults] = useState([]);
  const queryClient = useQueryClient();

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

  // Load edit data
  useEffect(() => {
    if (editSeries) {
      setSeriesName(editSeries.series_name || "");
      setAuthor(editSeries.author || "");
      setTotalBooks(editSeries.total_books?.toString() || "");
      setDescription(editSeries.description || "");
      setCoverUrl(editSeries.cover_url || "");
      // Ensure reading_order has unique keys or default to a new entry if empty
      const initialReadingOrder = editSeries.reading_order && editSeries.reading_order.length > 0
        ? editSeries.reading_order.map((item, idx) => ({
            order: item.order || (idx + 1),
            title: item.title || "",
            bookId: item.book_id || null,
            // When loading for edit, assume it's not "online" unless explicitly flagged or needed for display
            isOnline: !item.book_id && !!item.title,
          }))
        : [{ order: 1, title: "", bookId: null }];
      setReadingOrder(initialReadingOrder);
    }
  }, [editSeries]);

  // Filter books from library based on search query
  const myLibraryBooks = useMemo(() => {
    if (!searchQuery || searchQuery.length < 2) return [];
    
    const query = searchQuery.toLowerCase().trim();
    const myBookIds = myBooks.map(ub => ub.book_id);
    const libraryBooks = allBooks.filter(book => myBookIds.includes(book.id));
    
    return libraryBooks
      .filter(book => 
        book.title.toLowerCase().includes(query) ||
        book.author.toLowerCase().includes(query)
      )
      .slice(0, 5); // Limit to 5 results for library
  }, [searchQuery, myBooks, allBooks]);

  // Search Google Books API when user types
  useEffect(() => {
    if (activeOrderIndex === null || !searchQuery || searchQuery.length < 2) {
      setOnlineResults([]);
      return;
    }

    setIsSearchingOnline(true);
    const timeoutId = setTimeout(async () => {
      try {
        const response = await fetch(
          `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(searchQuery)}&maxResults=8&langRestrict=fr`
        );
        const data = await response.json();

        if (data.items) {
          const books = data.items.map(item => {
            let coverUrl = "";
            if (item.volumeInfo.imageLinks) {
              coverUrl = item.volumeInfo.imageLinks.large ||
                        item.volumeInfo.imageLinks.medium ||
                        item.volumeInfo.imageLinks.thumbnail ||
                        "";
              if (coverUrl) {
                coverUrl = coverUrl.replace('http:', 'https:');
                if (coverUrl.includes('books.google.com')) {
                  coverUrl = coverUrl.replace(/zoom=\d+/, 'zoom=3');
                  if (!coverUrl.includes('zoom=')) {
                    coverUrl += coverUrl.includes('?') ? '&zoom=3' : '?zoom=3';
                  }
                }
              }
            }

            return {
              id: item.id, // Using Google Books ID
              title: item.volumeInfo.title || "Titre inconnu",
              author: (item.volumeInfo.authors || ["Auteur inconnu"]).join(", "),
              coverUrl: coverUrl,
              isOnline: true
            };
          });
          setOnlineResults(books);
        } else {
          setOnlineResults([]);
        }
      } catch (error) {
        console.error("Erreur de recherche:", error);
        setOnlineResults([]);
      } finally {
        setIsSearchingOnline(false);
      }
    }, 500); // Debounce online search

    return () => clearTimeout(timeoutId);
  }, [searchQuery, activeOrderIndex]);

  const createMutation = useMutation({
    mutationFn: async (data) => {
      if (editSeries) {
        return await base44.entities.BookSeries.update(editSeries.id, data);
      }
      return await base44.entities.BookSeries.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookSeries'] });
      toast.success(editSeries ? "✨ Série modifiée avec succès !" : "✨ Série créée avec succès !");
      handleClose();
    },
    onError: (error) => {
      console.error("Error saving series:", error);
      toast.error(editSeries ? "Erreur lors de la modification de la série" : "Erreur lors de la création de la série");
    }
  });

  const handleClose = () => {
    setSeriesName("");
    setAuthor("");
    setTotalBooks("");
    setDescription("");
    setCoverUrl("");
    setReadingOrder([{ order: 1, title: "", bookId: null }]);
    setSearchQuery("");
    setActiveOrderIndex(null);
    setOnlineResults([]); // Reset online results
    setIsSearchingOnline(false); // Reset online search status
    onOpenChange(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!seriesName.trim() || !totalBooks) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }

    const data = {
      series_name: seriesName.trim(),
      author: author.trim() || undefined,
      total_books: parseInt(totalBooks),
      description: description.trim() || undefined,
      cover_url: coverUrl.trim() || undefined,
      reading_order: readingOrder
        .filter(ro => ro.title.trim() || ro.bookId)
        .map(ro => ({
          order: ro.order,
          title: ro.title.trim(),
          book_id: ro.bookId || undefined // Book ID from local library
        })),
      books_read: editSeries?.books_read || [], // Preserve existing if editing
      books_in_pal: editSeries?.books_in_pal || [], // Preserve existing if editing
      books_wishlist: editSeries?.books_wishlist || [] // Preserve existing if editing
    };

    createMutation.mutate(data);
  };

  const addBookToOrder = () => {
    setReadingOrder([...readingOrder, { 
      order: readingOrder.length + 1, 
      title: "", 
      bookId: null 
    }]);
  };

  const removeBookFromOrder = (index) => {
    const newOrder = readingOrder.filter((_, i) => i !== index);
    // Recalculate order numbers
    const reorderedBooks = newOrder.map((book, idx) => ({
      ...book,
      order: idx + 1
    }));
    setReadingOrder(reorderedBooks);
  };

  const updateOrderBook = (index, field, value) => {
    const newOrder = [...readingOrder];
    newOrder[index] = { ...newOrder[index], [field]: value };
    setReadingOrder(newOrder);
  };

  const selectBookForOrder = (index, book) => {
    const newOrder = [...readingOrder];
    newOrder[index] = {
      ...newOrder[index],
      title: book.title,
      // If it's an online book, we don't store its `bookId` in our DB.
      // We only store the title for online books.
      bookId: book.isOnline ? null : book.id, 
      isOnline: book.isOnline || false
    };
    setReadingOrder(newOrder);
    setSearchQuery("");
    setActiveOrderIndex(null);
    setOnlineResults([]); // Clear results after selection
  };

  // Combine library books and online results
  const combinedResults = useMemo(() => {
    const results = [];
    
    // Convert myLibraryBooks into the same format as onlineResults for consistent display
    const formattedMyLibraryBooks = myLibraryBooks.map(book => ({
      id: book.id,
      title: book.title,
      author: book.author,
      coverUrl: book.cover_url, // Use cover_url for local books
      isOnline: false
    }));

    if (formattedMyLibraryBooks.length > 0) {
      results.push({
        section: "Dans votre bibliothèque",
        books: formattedMyLibraryBooks
      });
    }
    
    if (onlineResults.length > 0) {
      results.push({
        section: "Recherche en ligne",
        books: onlineResults
      });
    }
    
    return results;
  }, [myLibraryBooks, onlineResults]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2" style={{ color: 'var(--dark-text)' }}>
            📚 {editSeries ? "Modifier la série" : "Créer une série"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <div className="space-y-4">
            <div>
              <Label htmlFor="seriesName">Nom de la série *</Label>
              <Input
                id="seriesName"
                value={seriesName}
                onChange={(e) => setSeriesName(e.target.value)}
                placeholder="Ex: Throne of Glass"
                required
              />
            </div>

            <div>
              <Label htmlFor="author">Auteur</Label>
              <Input
                id="author"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="Ex: Sarah J. Maas"
              />
            </div>

            <div>
              <Label htmlFor="totalBooks">Nombre total de tomes *</Label>
              <Input
                id="totalBooks"
                type="number"
                min="1"
                value={totalBooks}
                onChange={(e) => setTotalBooks(e.target.value)}
                placeholder="Ex: 8"
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Décrivez la série..."
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="coverUrl">URL de la couverture</Label>
              <Input
                id="coverUrl"
                value={coverUrl}
                onChange={(e) => setCoverUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <Label>Organiser les tomes 📖</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addBookToOrder}
              >
                <Plus className="w-4 h-4 mr-1" />
                Ajouter un tome
              </Button>
            </div>
            <p className="text-xs mb-3" style={{ color: 'var(--warm-pink)' }}>
              Recherchez des livres de votre bibliothèque ou trouvez-les en ligne. Vous pouvez aussi ajouter des titres manuellement.
            </p>

            <div className="space-y-3">
              {readingOrder.map((book, index) => (
                <div key={index} className="flex items-start gap-2 p-3 rounded-lg" 
                     style={{ backgroundColor: 'var(--cream)' }}>
                  <div className="flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0 font-bold text-white"
                       style={{ backgroundColor: 'var(--deep-pink)' }}>
                    {book.order}
                  </div>
                  <div className="flex-1 space-y-2 relative">
                    <div className="relative">
                      <Input
                        value={activeOrderIndex === index ? searchQuery : book.title}
                        onChange={(e) => {
                          if (activeOrderIndex === index) {
                            setSearchQuery(e.target.value);
                          } else {
                            updateOrderBook(index, 'title', e.target.value);
                          }
                        }}
                        onFocus={() => {
                          setActiveOrderIndex(index);
                          // Only set searchQuery if the book has a title, otherwise start fresh
                          setSearchQuery(book.title || "");
                        }}
                        onBlur={() => {
                          // Delay to allow click on suggestion
                          setTimeout(() => {
                            if (activeOrderIndex === index) {
                              setActiveOrderIndex(null);
                              setSearchQuery("");
                              setOnlineResults([]); // Clear online results on blur
                            }
                          }, 200);
                        }}
                        placeholder="Rechercher un livre ou saisir le titre manuellement"
                        className="pr-8"
                      />
                      {isSearchingOnline && activeOrderIndex === index ? (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />
                      ) : (
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      )}
                      
                      {/* Combined dropdown */}
                      {activeOrderIndex === index && searchQuery.length >= 2 && combinedResults.length > 0 && (
                        <div className="absolute z-50 w-full mt-1 bg-white rounded-lg shadow-lg border-2 max-h-96 overflow-y-auto"
                             style={{ borderColor: 'var(--beige)' }}>
                          {combinedResults.map((section, sIdx) => (
                            <div key={sIdx}>
                              <div className="sticky top-0 bg-gray-50 px-3 py-2 text-xs font-bold text-gray-600 border-b"
                                   style={{ borderColor: 'var(--beige)' }}>
                                {section.section}
                              </div>
                              {section.books.map((bookOption) => (
                                <button
                                  key={bookOption.id || `${bookOption.title}-${bookOption.author}`} // Fallback key for online books without unique IDs
                                  type="button"
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    selectBookForOrder(index, bookOption);
                                  }}
                                  className="w-full flex items-center gap-3 p-3 hover:bg-pink-50 transition-colors text-left border-b last:border-b-0"
                                  style={{ borderColor: 'var(--beige)' }}
                                >
                                  <div className="w-12 h-16 rounded overflow-hidden flex-shrink-0"
                                       style={{ backgroundColor: 'var(--beige)' }}>
                                    {bookOption.coverUrl ? (
                                      <img 
                                        src={bookOption.coverUrl} 
                                        alt={bookOption.title} 
                                        className="w-full h-full object-cover" 
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center">
                                        <BookOpen className="w-5 h-5" style={{ color: 'var(--warm-pink)' }} />
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm line-clamp-1" 
                                       style={{ color: 'var(--dark-text)' }}>
                                      {bookOption.title}
                                    </p>
                                    <p className="text-xs line-clamp-1" 
                                       style={{ color: 'var(--warm-pink)' }}>
                                      {bookOption.author}
                                    </p>
                                    {bookOption.isOnline && (
                                      <p className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>
                                        🌐 Recherche en ligne
                                      </p>
                                    )}
                                  </div>
                                </button>
                              ))}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    {book.bookId && !book.isOnline && (
                      <p className="text-xs mt-1" style={{ color: '#10b981' }}>
                        ✓ Dans votre bibliothèque
                      </p>
                    )}
                    {book.isOnline && (
                      <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>
                        🌐 Ajouté depuis la recherche en ligne (non lié à votre bibliothèque)
                      </p>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeBookFromOrder(index)}
                    className="flex-shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending}
              className="text-white font-medium"
              style={{ background: 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))' }}
            >
              {createMutation.isPending ? (editSeries ? "Modification..." : "Création...") : (editSeries ? "Modifier la série" : "Créer la série")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
