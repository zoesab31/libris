import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { BookUser, Search, BookOpen, Star } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import AuthorDetailsDialog from "../components/authors/AuthorDetailsDialog";

export default function Authors() {
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAuthor, setSelectedAuthor] = useState(null);

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: myBooks = [], isLoading: loadingMyBooks } = useQuery({
    queryKey: ['myBooks'],
    queryFn: () => base44.entities.UserBook.filter({ created_by: user?.email }),
    enabled: !!user,
  });

  const { data: allBooks = [], isLoading: loadingBooks } = useQuery({
    queryKey: ['books'],
    queryFn: () => base44.entities.Book.list(),
  });

  const authorsData = useMemo(() => {
    const authorMap = new Map();

    allBooks.forEach(book => {
      if (!book.author) return;
      
      const userBook = myBooks.find(ub => ub.book_id === book.id);
      
      if (!authorMap.has(book.author)) {
        authorMap.set(book.author, {
          name: book.author,
          totalBooks: 0,
          readBooks: [],
          unreadBooks: [],
          averageRating: 0,
          totalRatings: 0,
        });
      }

      const authorData = authorMap.get(book.author);
      authorData.totalBooks++;

      if (userBook) {
        if (userBook.status === "Lu") {
          authorData.readBooks.push({ ...book, userBook });
          if (userBook.rating) {
            authorData.totalRatings += userBook.rating;
          }
        } else {
          authorData.unreadBooks.push({ ...book, userBook });
        }
      }
    });

    // Calculate average ratings
    authorMap.forEach((data, author) => {
      if (data.readBooks.length > 0) {
        const ratingsCount = data.readBooks.filter(b => b.userBook.rating).length;
        data.averageRating = ratingsCount > 0 ? data.totalRatings / ratingsCount : 0;
      }
    });

    return Array.from(authorMap.values())
      .filter(a => a.readBooks.length > 0 || a.unreadBooks.length > 0)
      .sort((a, b) => b.readBooks.length - a.readBooks.length);
  }, [allBooks, myBooks]);

  const filteredAuthors = authorsData.filter(author =>
    author.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isLoading = loadingMyBooks || loadingBooks;

  return (
    <div className="p-4 md:p-8 min-h-screen" style={{ backgroundColor: 'var(--cream)' }}>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-md"
               style={{ background: 'linear-gradient(135deg, var(--soft-brown), var(--rose-gold))' }}>
            <BookUser className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-bold" style={{ color: 'var(--deep-brown)' }}>
              Mes Auteurs
            </h1>
            <p className="text-lg" style={{ color: 'var(--warm-brown)' }}>
              {authorsData.length} auteur{authorsData.length > 1 ? 's' : ''} dans votre bibliothèque
            </p>
          </div>
        </div>

        <div className="mb-6 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" 
                  style={{ color: 'var(--warm-brown)' }} />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher un auteur..."
            className="pl-12 py-6 text-lg bg-white shadow-md rounded-xl border-0"
          />
        </div>

        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array(6).fill(0).map((_, i) => (
              <div key={i} className="p-6 rounded-xl bg-white shadow-md">
                <Skeleton className="h-6 w-3/4 mb-3" />
                <Skeleton className="h-4 w-1/2 mb-2" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ))}
          </div>
        ) : filteredAuthors.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAuthors.map((author) => (
              <button
                key={author.name}
                onClick={() => setSelectedAuthor(author)}
                className="p-6 rounded-xl bg-white shadow-md hover:shadow-xl transition-all duration-300 
                         hover:-translate-y-1 text-left border-2 border-transparent hover:border-opacity-50"
                style={{ '--hover-border-color': 'var(--soft-brown)' }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-white text-xl font-bold"
                       style={{ background: 'linear-gradient(135deg, var(--soft-brown), var(--rose-gold))' }}>
                    {author.name[0].toUpperCase()}
                  </div>
                  {author.averageRating > 0 && (
                    <div className="flex items-center gap-1 px-2 py-1 rounded-full"
                         style={{ backgroundColor: 'var(--cream)' }}>
                      <Star className="w-4 h-4 fill-current" style={{ color: 'var(--gold)' }} />
                      <span className="text-sm font-bold" style={{ color: 'var(--deep-brown)' }}>
                        {author.averageRating.toFixed(1)}
                      </span>
                    </div>
                  )}
                </div>

                <h3 className="font-bold text-lg mb-3 line-clamp-2" style={{ color: 'var(--deep-brown)' }}>
                  {author.name}
                </h3>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span style={{ color: 'var(--warm-brown)' }}>Livres lus</span>
                    <span className="font-bold px-2 py-1 rounded-lg" 
                          style={{ backgroundColor: 'var(--cream)', color: 'var(--deep-brown)' }}>
                      {author.readBooks.length}
                    </span>
                  </div>
                  {author.unreadBooks.length > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span style={{ color: 'var(--warm-brown)' }}>À lire</span>
                      <span className="font-bold px-2 py-1 rounded-lg" 
                            style={{ backgroundColor: 'var(--beige)', color: 'var(--deep-brown)' }}>
                        {author.unreadBooks.length}
                      </span>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t flex -space-x-2" style={{ borderColor: 'var(--beige)' }}>
                  {author.readBooks.slice(0, 3).map((book, idx) => (
                    <div key={idx} 
                         className="w-10 h-14 rounded-md overflow-hidden shadow-md border-2 border-white"
                         style={{ backgroundColor: 'var(--beige)' }}>
                      {book.cover_url ? (
                        <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <BookOpen className="w-4 h-4" style={{ color: 'var(--warm-brown)' }} />
                        </div>
                      )}
                    </div>
                  ))}
                  {author.readBooks.length > 3 && (
                    <div className="w-10 h-14 rounded-md shadow-md border-2 border-white flex items-center justify-center text-xs font-bold"
                         style={{ backgroundColor: 'var(--soft-brown)', color: 'white' }}>
                      +{author.readBooks.length - 3}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <BookUser className="w-20 h-20 mx-auto mb-6 opacity-20" style={{ color: 'var(--warm-brown)' }} />
            <h3 className="text-2xl font-bold mb-2" style={{ color: 'var(--deep-brown)' }}>
              {searchQuery ? "Aucun auteur trouvé" : "Aucun auteur dans votre bibliothèque"}
            </h3>
            <p className="text-lg" style={{ color: 'var(--warm-brown)' }}>
              {searchQuery ? "Essayez une autre recherche" : "Ajoutez des livres pour voir vos auteurs"}
            </p>
          </div>
        )}

        {selectedAuthor && (
          <AuthorDetailsDialog
            author={selectedAuthor}
            open={!!selectedAuthor}
            onOpenChange={(open) => !open && setSelectedAuthor(null)}
          />
        )}
      </div>
    </div>
  );
}