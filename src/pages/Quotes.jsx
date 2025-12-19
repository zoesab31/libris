import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Quote as QuoteIcon, Plus, Search, Trash2 } from "lucide-react";
import AddQuoteDialog from "../components/quotes/AddQuoteDialog";
import QuoteCard from "../components/quotes/QuoteCard";

export default function Quotes() {
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedBook, setSelectedBook] = useState("all");

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: quotes = [], isLoading } = useQuery({
    queryKey: ['quotes'],
    queryFn: async () => {
      const allQuotes = await base44.entities.Quote.filter({ created_by: user?.email });
      return allQuotes.sort((a, b) => (b.page_number || 0) - (a.page_number || 0));
    },
    enabled: !!user,
  });

  const { data: allBooks = [] } = useQuery({
    queryKey: ['books'],
    queryFn: () => base44.entities.Book.list(),
  });

  const { data: myBooks = [] } = useQuery({
    queryKey: ['myBooks'],
    queryFn: () => base44.entities.UserBook.filter({ created_by: user?.email }),
    enabled: !!user,
  });

  // Find current reading or last read book
  const priorityBookId = React.useMemo(() => {
    const currentReading = myBooks.find(b => b.status === "En cours");
    if (currentReading) return currentReading.book_id;
    
    const lastRead = myBooks
      .filter(b => b.status === "Lu" && b.end_date)
      .sort((a, b) => new Date(b.end_date) - new Date(a.end_date))[0];
    
    return lastRead?.book_id;
  }, [myBooks]);

  // Group quotes by book
  const quotesByBook = quotes.reduce((acc, quote) => {
    const book = allBooks.find(b => b.id === quote.book_id);
    if (book) {
      if (!acc[book.id]) {
        acc[book.id] = {
          book,
          quotes: [],
          isPriority: book.id === priorityBookId
        };
      }
      acc[book.id].quotes.push(quote);
    }
    return acc;
  }, {});

  // Sort books: priority book first, then others
  const sortedQuotesByBook = Object.values(quotesByBook).sort((a, b) => {
    if (a.isPriority && !b.isPriority) return -1;
    if (!a.isPriority && b.isPriority) return 1;
    return 0;
  });

  const filteredQuotes = selectedBook === "all" 
    ? sortedQuotesByBook
    : sortedQuotesByBook.filter(group => group.book.id === selectedBook);

  const searchedQuotes = filteredQuotes.filter(group => 
    group.book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    group.quotes.some(q => q.quote_text.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="p-4 md:p-8 min-h-screen" style={{ backgroundColor: 'var(--cream)' }}>
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-md"
                 style={{ background: 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))' }}>
              <QuoteIcon className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold" style={{ color: 'var(--dark-text)' }}>
                Mes Citations
              </h1>
              <p className="text-lg" style={{ color: 'var(--warm-pink)' }}>
                {quotes.length} citation{quotes.length > 1 ? 's' : ''} sauvegardée{quotes.length > 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <Button 
            onClick={() => setShowAddDialog(true)}
            className="shadow-lg text-white font-medium px-6 rounded-xl"
            style={{ background: 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))' }}>
            <Plus className="w-5 h-5 mr-2" />
            Ajouter une citation
          </Button>
        </div>

        <div className="mb-6 flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" 
                    style={{ color: 'var(--warm-pink)' }} />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher une citation..."
              className="pl-12 py-6 text-lg bg-white shadow-md rounded-xl border-0"
            />
          </div>
        </div>

        {searchedQuotes.length > 0 ? (
          <div className="space-y-8">
            {searchedQuotes.map(({ book, quotes, isPriority }) => (
              <div key={book.id} className={isPriority ? "relative" : ""}>
                {isPriority && (
                  <div className="absolute -top-2 left-4 px-3 py-1 rounded-full text-xs font-bold text-white shadow-lg z-10"
                       style={{ background: 'linear-gradient(135deg, #FF1493, #FF69B4)' }}>
                    📖 En cours / Dernier lu
                  </div>
                )}
                <div className={`flex items-center gap-3 mb-4 p-4 rounded-xl ${isPriority ? 'shadow-lg' : ''}`}
                     style={{ backgroundColor: isPriority ? '#FFF0F6' : 'transparent' }}>
                  <div className="w-16 h-24 rounded-lg overflow-hidden shadow-md flex-shrink-0"
                       style={{ backgroundColor: 'var(--beige)' }}>
                    {book.cover_url ? (
                      <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <QuoteIcon className="w-6 h-6" style={{ color: 'var(--warm-pink)' }} />
                      </div>
                    )}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold" style={{ color: 'var(--dark-text)' }}>
                      {book.title}
                    </h2>
                    <p className="text-sm" style={{ color: 'var(--warm-pink)' }}>
                      {book.author} • {quotes.length} citation{quotes.length > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  {quotes.map((quote) => (
                    <QuoteCard key={quote.id} quote={quote} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <QuoteIcon className="w-20 h-20 mx-auto mb-6 opacity-20" style={{ color: 'var(--warm-pink)' }} />
            <h3 className="text-2xl font-bold mb-2" style={{ color: 'var(--dark-text)' }}>
              {searchQuery ? "Aucune citation trouvée" : "Aucune citation enregistrée"}
            </h3>
            <p className="text-lg" style={{ color: 'var(--warm-pink)' }}>
              {searchQuery ? "Essayez une autre recherche" : "Commencez à sauvegarder vos citations préférées"}
            </p>
          </div>
        )}

        <AddQuoteDialog 
          open={showAddDialog}
          onOpenChange={setShowAddDialog}
          books={allBooks}
        />
      </div>
    </div>
  );
}