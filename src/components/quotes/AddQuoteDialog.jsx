import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Loader2, Search, BookOpen } from "lucide-react";
import { toast } from "sonner";

export default function AddQuoteDialog({ open, onOpenChange, books }) {
  const queryClient = useQueryClient();
  const [user, setUser] = React.useState(null);
  const [quoteData, setQuoteData] = useState({
    book_id: "",
    quote_text: "",
    page_number: "",
    note: "",
  });
  const [searchQuery, setSearchQuery] = useState("");

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: myBooks = [] } = useQuery({
    queryKey: ['myBooksForQuotes', user?.email],
    queryFn: () => base44.entities.UserBook.filter({ created_by: user?.email }),
    enabled: !!user,
  });

  // Filter to show books that are "Lu" or "En cours"
  const availableBooks = useMemo(() => {
    return books.filter(book => 
      myBooks.some(ub => ub.book_id === book.id && (ub.status === "Lu" || ub.status === "En cours"))
    );
  }, [books, myBooks]);

  // Filter books by search query
  const filteredBooks = useMemo(() => {
    if (!searchQuery || searchQuery.length < 2) return availableBooks;
    const query = searchQuery.toLowerCase().trim();
    return availableBooks.filter(book =>
      book.title.toLowerCase().includes(query) ||
      book.author.toLowerCase().includes(query)
    );
  }, [searchQuery, availableBooks]);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Quote.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      toast.success("Citation ajoutée !");
      onOpenChange(false);
      setQuoteData({ book_id: "", quote_text: "", page_number: "", note: "" });
      setSearchQuery("");
    },
  });

  const selectedBook = books.find(b => b.id === quoteData.book_id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl" style={{ color: 'var(--deep-brown)' }}>
            ✨ Ajouter une citation
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="book-search">Rechercher un livre</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" 
                      style={{ color: 'var(--warm-pink)' }} />
              <Input
                id="book-search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher par titre ou auteur..."
                className="pl-10"
              />
            </div>
          </div>

          {searchQuery.length >= 2 && (
            <div className="max-h-60 overflow-y-auto space-y-2 p-2 rounded-lg border-2" 
                 style={{ borderColor: 'var(--beige)' }}>
              {filteredBooks.length > 0 ? (
                filteredBooks.map((book) => {
                  const userBook = myBooks.find(ub => ub.book_id === book.id);
                  const isCurrentlyReading = userBook?.status === "En cours";
                  
                  return (
                    <button
                      key={book.id}
                      type="button"
                      onClick={() => {
                        setQuoteData({...quoteData, book_id: book.id});
                        setSearchQuery("");
                      }}
                      className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-pink-50 transition-colors text-left"
                      style={{
                        backgroundColor: quoteData.book_id === book.id ? 'var(--cream)' : 'white',
                        border: '2px solid',
                        borderColor: quoteData.book_id === book.id ? 'var(--deep-pink)' : 'var(--beige)'
                      }}
                    >
                      <div className="w-12 h-16 rounded-md overflow-hidden flex-shrink-0"
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
                        <p className="font-bold text-sm line-clamp-1" style={{ color: 'var(--dark-text)' }}>
                          {book.title}
                        </p>
                        <p className="text-xs line-clamp-1" style={{ color: 'var(--warm-pink)' }}>
                          {book.author}
                        </p>
                        {isCurrentlyReading && (
                          <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-bold bg-gradient-to-r from-yellow-400 to-orange-500 text-white">
                            📖 En cours
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })
              ) : (
                <p className="text-center py-4 text-sm" style={{ color: 'var(--warm-pink)' }}>
                  Aucun livre trouvé
                </p>
              )}
            </div>
          )}

          {selectedBook && (
            <div className="p-4 rounded-lg flex items-center gap-3"
                 style={{ backgroundColor: 'var(--cream)' }}>
              <div className="w-12 h-16 rounded-md overflow-hidden flex-shrink-0"
                   style={{ backgroundColor: 'var(--beige)' }}>
                {selectedBook.cover_url ? (
                  <img src={selectedBook.cover_url} alt={selectedBook.title} 
                       className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <BookOpen className="w-5 h-5" style={{ color: 'var(--warm-pink)' }} />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <p className="font-bold text-sm" style={{ color: 'var(--dark-text)' }}>
                  {selectedBook.title}
                </p>
                <p className="text-xs" style={{ color: 'var(--warm-pink)' }}>
                  {selectedBook.author}
                </p>
              </div>
            </div>
          )}

          {!selectedBook && searchQuery.length < 2 && (
            <div className="text-center py-8">
              <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-20" style={{ color: 'var(--warm-pink)' }} />
              <p className="text-sm" style={{ color: 'var(--warm-brown)' }}>
                Recherchez un livre pour commencer
              </p>
              <p className="text-xs mt-2" style={{ color: 'var(--warm-brown)' }}>
                💡 Vous pouvez ajouter des citations pour vos livres lus ou en cours de lecture
              </p>
            </div>
          )}

          <div>
            <Label htmlFor="quote">Citation *</Label>
            <Textarea
              id="quote"
              value={quoteData.quote_text}
              onChange={(e) => setQuoteData({...quoteData, quote_text: e.target.value})}
              placeholder="La citation que vous souhaitez sauvegarder..."
              rows={5}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="page">Page</Label>
              <Input
                id="page"
                type="number"
                value={quoteData.page_number}
                onChange={(e) => setQuoteData({...quoteData, page_number: e.target.value})}
                placeholder="150"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="note">Note personnelle</Label>
            <Textarea
              id="note"
              value={quoteData.note}
              onChange={(e) => setQuoteData({...quoteData, note: e.target.value})}
              placeholder="Pourquoi vous aimez cette citation..."
              rows={3}
            />
          </div>

          <Button
            onClick={() => createMutation.mutate(quoteData)}
            disabled={!quoteData.book_id || !quoteData.quote_text || createMutation.isPending}
            className="w-full font-medium py-6"
            style={{ background: 'linear-gradient(135deg, var(--warm-brown), var(--soft-brown))', color: '#000000' }}
          >
            {createMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Ajout en cours...
              </>
            ) : (
              "Ajouter la citation"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}