import React, { useState, useMemo } from "react";
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
import { Plus, X, Search } from "lucide-react";
import { toast } from "sonner";

export default function AddSeriesDialog({ open, onOpenChange, user }) {
  const [seriesName, setSeriesName] = useState("");
  const [author, setAuthor] = useState("");
  const [totalBooks, setTotalBooks] = useState("");
  const [description, setDescription] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [readingOrder, setReadingOrder] = useState([{ order: 1, title: "", bookId: null }]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeOrderIndex, setActiveOrderIndex] = useState(null);
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

  // Filter books based on search query
  const filteredBooks = useMemo(() => {
    if (!searchQuery || searchQuery.length < 2) return [];
    
    const query = searchQuery.toLowerCase().trim();
    
    // Get books from my library
    const myBookIds = myBooks.map(ub => ub.book_id);
    const myLibraryBooks = allBooks.filter(book => myBookIds.includes(book.id));
    
    // Filter by search query
    return myLibraryBooks
      .filter(book => 
        book.title.toLowerCase().includes(query) ||
        book.author.toLowerCase().includes(query)
      )
      .slice(0, 10); // Limit to 10 results
  }, [searchQuery, myBooks, allBooks]);

  const createMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.BookSeries.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookSeries'] });
      toast.success("✨ Série créée avec succès !");
      handleClose();
    },
    onError: (error) => {
      console.error("Error creating series:", error);
      toast.error("Erreur lors de la création de la série");
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
          book_id: ro.bookId || undefined
        })),
      books_read: [],
      books_in_pal: [],
      books_wishlist: []
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
      bookId: book.id
    };
    setReadingOrder(newOrder);
    setSearchQuery("");
    setActiveOrderIndex(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2" style={{ color: 'var(--dark-text)' }}>
            📚 Créer une série
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
              Ajoutez les tomes de la série dans l'ordre. Vous pouvez lier des livres de votre bibliothèque ou ajouter des titres manuellement.
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
                          setSearchQuery(book.title);
                        }}
                        onBlur={() => {
                          // Delay to allow click on suggestion
                          setTimeout(() => {
                            if (activeOrderIndex === index) {
                              setActiveOrderIndex(null);
                              setSearchQuery("");
                            }
                          }, 200);
                        }}
                        placeholder="Choisir un livre de votre bibliothèque"
                        className="pr-8"
                      />
                      <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      
                      {/* Autocomplete dropdown */}
                      {activeOrderIndex === index && searchQuery.length >= 2 && filteredBooks.length > 0 && (
                        <div className="absolute z-50 w-full mt-1 bg-white rounded-lg shadow-lg border-2 max-h-64 overflow-y-auto"
                             style={{ borderColor: 'var(--beige)' }}>
                          {filteredBooks.map((bookOption) => (
                            <button
                              key={bookOption.id}
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                selectBookForOrder(index, bookOption);
                              }}
                              className="w-full flex items-center gap-3 p-3 hover:bg-pink-50 transition-colors text-left"
                            >
                              <div className="w-12 h-16 rounded overflow-hidden flex-shrink-0"
                                   style={{ backgroundColor: 'var(--beige)' }}>
                                {bookOption.cover_url ? (
                                  <img src={bookOption.cover_url} alt={bookOption.title} 
                                       className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-xs">
                                    📖
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
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {book.bookId && (
                      <p className="text-xs" style={{ color: 'var(--warm-pink)' }}>
                        ✓ Lié à votre bibliothèque
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
              {createMutation.isPending ? "Création..." : "Créer la série"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}