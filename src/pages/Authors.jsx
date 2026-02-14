import React, { useState, useMemo, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BookUser, Search, BookOpen, Star } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import AuthorDetailsDialog from "../components/authors/AuthorDetailsDialog";

export default function Authors() {
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAuthor, setSelectedAuthor] = useState(null);
  const [letterFilter, setLetterFilter] = useState('All');
  const [viewMode, setViewMode] = useState("authors"); // "authors" or "books"

  useEffect(() => {
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

  // Group books by first letter and sort alphabetically
  const booksByLetter = useMemo(() => {
    const myBooksWithDetails = myBooks.map(ub => ({
      ...ub,
      book: allBooks.find(b => b.id === ub.book_id)
    })).filter(item => item.book);

    const grouped = {};
    myBooksWithDetails.forEach(item => {
      if (!item.book || !item.book.title) return;
      const firstLetter = item.book.title[0].toUpperCase();
      if (!grouped[firstLetter]) {
        grouped[firstLetter] = [];
      }
      grouped[firstLetter].push(item);
    });

    // Sort books within each letter group alphabetically
    Object.keys(grouped).forEach(letter => {
      grouped[letter].sort((a, b) => 
        a.book.title.localeCompare(b.book.title, 'fr', { sensitivity: 'base' })
      );
    });

    return grouped;
  }, [myBooks, allBooks]);

  const filteredAuthors = authorsData.filter(author => {
    const matchesSearch = author.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLetter = letterFilter === 'All' ? true : author.name.trim().charAt(0).toUpperCase() === letterFilter;
    return matchesSearch && matchesLetter;
  }).sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }));

  const isLoading = loadingMyBooks || loadingBooks;

  return (
    <div className="p-4 md:p-8 min-h-screen" style={{ backgroundColor: 'var(--cream)' }}>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-md"
               style={{ background: 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))' }}>
            <BookUser className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-bold" style={{ color: 'var(--dark-text)' }}>
              Abécédaire
            </h1>
            <p className="text-lg" style={{ color: 'var(--warm-pink)' }}>
              {viewMode === "authors" 
                ? `${authorsData.length} auteur${authorsData.length > 1 ? 's' : ''}`
                : `${myBooks.length} livre${myBooks.length > 1 ? 's' : ''}`
              }
            </p>
          </div>
        </div>

        <div className="mb-6 flex flex-col md:flex-row gap-4">
          <div className="flex gap-2">
            <Button
              variant={viewMode === "authors" ? "default" : "outline"}
              onClick={() => {
                setViewMode("authors");
                setSearchQuery("");
              }}
              className="rounded-xl"
              style={viewMode === "authors" ? {
                background: 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))',
                color: 'white'
              } : {
                backgroundColor: 'white',
                color: 'var(--dark-text)',
                borderColor: 'var(--beige)'
              }}
            >
              Par Auteurs
            </Button>
            <Button
              variant={viewMode === "books" ? "default" : "outline"}
              onClick={() => {
                setViewMode("books");
                setSearchQuery("");
              }}
              className="rounded-xl"
              style={viewMode === "books" ? {
                background: 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))',
                color: 'white'
              } : {
                backgroundColor: 'white',
                color: 'var(--dark-text)',
                borderColor: 'var(--beige)'
              }}
            >
              Par Livres
            </Button>
          </div>

          {/* A–Z Filter */}
          <div className="flex flex-wrap gap-1 md:gap-2">
            {['All', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')].map(l => (
              <button
                key={l}
                onClick={()=> setLetterFilter(l)}
                className={`px-2 py-1 text-sm rounded-lg ${letterFilter===l? 'bg-pink-600 text-white' : 'bg-white text-pink-600 border'}`}
              >{l}</button>
            ))}
          </div>

          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" 
                    style={{ color: 'var(--warm-pink)' }} />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={viewMode === "authors" ? "Rechercher un auteur..." : "Rechercher un livre..."}
              className="pl-12 py-6 text-lg bg-white shadow-md rounded-xl border-0"
            />
          </div>
        </div>

        {viewMode === "authors" ? (
          // Authors view
          isLoading ? (
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
                  style={{ '--hover-border-color': 'var(--warm-pink)' }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center text-white text-xl font-bold"
                         style={{ background: 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))' }}>
                      {author.name[0].toUpperCase()}
                    </div>
                    {author.averageRating > 0 && (
                      <div className="flex items-center gap-1 px-2 py-1 rounded-full"
                           style={{ backgroundColor: 'var(--cream)' }}>
                        <Star className="w-4 h-4 fill-current" style={{ color: 'var(--gold)' }} />
                        <span className="text-sm font-bold" style={{ color: 'var(--dark-text)' }}>
                          {author.averageRating.toFixed(1)}
                        </span>
                      </div>
                    )}
                  </div>

                  <h3 className="font-bold text-lg mb-3 line-clamp-2" style={{ color: 'var(--dark-text)' }}>
                    {author.name}
                  </h3>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span style={{ color: 'var(--warm-pink)' }}>Livres lus</span>
                      <span className="font-bold px-2 py-1 rounded-lg" 
                            style={{ backgroundColor: 'var(--cream)', color: 'var(--dark-text)' }}>
                        {author.readBooks.length}
                      </span>
                    </div>
                    {author.unreadBooks.length > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span style={{ color: 'var(--warm-pink)' }}>À lire</span>
                        <span className="font-bold px-2 py-1 rounded-lg" 
                              style={{ backgroundColor: 'var(--beige)', color: 'var(--dark-text)' }}>
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
                            <BookOpen className="w-4 h-4" style={{ color: 'var(--warm-pink)' }} />
                          </div>
                        )}
                      </div>
                    ))}
                    {author.readBooks.length > 3 && (
                      <div className="w-10 h-14 rounded-md shadow-md border-2 border-white flex items-center justify-center text-xs font-bold"
                           style={{ backgroundColor: 'var(--deep-pink)', color: 'white' }}>
                        +{author.readBooks.length - 3}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <BookUser className="w-20 h-20 mx-auto mb-6 opacity-20" style={{ color: 'var(--warm-pink)' }} />
              <h3 className="text-2xl font-bold mb-2" style={{ color: 'var(--dark-text)' }}>
                {searchQuery ? "Aucun auteur trouvé" : "Aucun auteur dans votre bibliothèque"}
              </h3>
              <p className="text-lg" style={{ color: 'var(--warm-pink)' }}>
                {searchQuery ? "Essayez une autre recherche" : "Ajoutez des livres pour voir vos auteurs"}
              </p>
            </div>
          )
        ) : (
          // Books view (alphabetical)
          <div className="space-y-8">
            {isLoading ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Array(6).fill(0).map((_, i) => (
                    <div key={i} className="flex gap-3 p-4 rounded-xl bg-white shadow-md">
                      <Skeleton className="w-16 h-24 rounded-lg flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <Skeleton className="h-4 w-3/4 mb-2" />
                        <Skeleton className="h-3 w-1/2 mb-3" />
                        <Skeleton className="h-4 w-1/4 rounded-full" />
                      </div>
                    </div>
                  ))}
                </div>
            ) : Object.keys(booksByLetter).length > 0 ? (
                Object.keys(booksByLetter).sort().map(letter => {
                  const booksForLetter = booksByLetter[letter].filter(item => 
                    searchQuery ? item.book.title.toLowerCase().includes(searchQuery.toLowerCase()) : true
                  );

                  if (booksForLetter.length === 0) return null;

                  return (
                    <div key={letter}>
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl font-bold text-white shadow-md"
                             style={{ background: 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))' }}>
                          {letter}
                        </div>
                        <div className="flex-1 h-px" style={{ backgroundColor: 'var(--beige)' }} />
                      </div>

                      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {booksForLetter.map(item => (
                          <div key={item.id} className="flex gap-3 p-4 rounded-xl bg-white shadow-md hover:shadow-lg transition-all">
                            <div className="w-16 h-24 rounded-lg overflow-hidden shadow-md flex-shrink-0"
                                 style={{ backgroundColor: 'var(--beige)' }}>
                              {item.book.cover_url ? (
                                <img src={item.book.cover_url} alt={item.book.title} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <BookOpen className="w-6 h-6" style={{ color: 'var(--warm-pink)' }} />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-bold text-sm mb-1 line-clamp-2" style={{ color: 'var(--dark-text)' }}>
                                {item.book.title}
                              </h3>
                              <p className="text-xs mb-2" style={{ color: 'var(--warm-pink)' }}>
                                {item.book.author}
                              </p>
                              <span className="text-xs px-2 py-1 rounded-full" 
                                    style={{ 
                                      backgroundColor: item.status === "Lu" ? 'var(--cream)' : 'var(--beige)',
                                      color: 'var(--dark-text)'
                                    }}>
                                {item.status === "Lu" ? "Lu" : item.status === "À lire" ? "À lire" : "En cours"}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
            ) : (
                <div className="text-center py-20">
                  <BookOpen className="w-20 h-20 mx-auto mb-6 opacity-20" style={{ color: 'var(--warm-pink)' }} />
                  <h3 className="text-2xl font-bold mb-2" style={{ color: 'var(--dark-text)' }}>
                    {searchQuery ? "Aucun livre trouvé" : "Aucun livre dans votre bibliothèque"}
                  </h3>
                  <p className="text-lg" style={{ color: 'var(--warm-pink)' }}>
                    {searchQuery ? "Essayez une autre recherche" : "Ajoutez des livres pour voir votre abécédaire"}
                  </p>
                </div>
            )}
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