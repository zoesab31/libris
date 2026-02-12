import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Search, BookOpen, User as UserIcon, Tag, Library, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function GlobalSearch({ user }) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const searchRef = useRef(null);
  const navigate = useNavigate();

  const { data: allBooks = [] } = useQuery({
    queryKey: ['books'],
    queryFn: () => base44.entities.Book.list(),
    enabled: isOpen && query.length >= 2,
  });

  const { data: myBooks = [] } = useQuery({
    queryKey: ['myBooks'],
    queryFn: () => base44.entities.UserBook.filter({ created_by: user?.email }),
    enabled: !!user && isOpen && query.length >= 2,
  });

  const { data: customShelves = [] } = useQuery({
    queryKey: ['customShelves'],
    queryFn: () => base44.entities.CustomShelf.filter({ created_by: user?.email }),
    enabled: !!user && isOpen && query.length >= 2,
  });

  const { data: readingLists = [] } = useQuery({
    queryKey: ['readingLists'],
    queryFn: () => base44.entities.ReadingList.filter({ created_by: user?.email }),
    enabled: !!user && isOpen && query.length >= 2,
  });

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchResults = React.useMemo(() => {
    if (query.length < 2) return { books: [], authors: [], shelves: [], pals: [] };

    const q = query.toLowerCase();

    // Search books
    const books = allBooks
      .filter(book => 
        book.title.toLowerCase().includes(q) ||
        book.author.toLowerCase().includes(q) ||
        book.custom_genres?.some(g => g.toLowerCase().includes(q))
      )
      .slice(0, 5);

    // Unique authors
    const authors = [...new Set(
      allBooks
        .filter(book => book.author.toLowerCase().includes(q))
        .map(book => book.author)
    )].slice(0, 3);

    // Custom shelves
    const shelves = customShelves
      .filter(shelf => shelf.name.toLowerCase().includes(q))
      .slice(0, 3);

    // PALs
    const pals = readingLists
      .filter(pal => 
        pal.name.toLowerCase().includes(q) ||
        pal.theme?.toLowerCase().includes(q)
      )
      .slice(0, 3);

    return { books, authors, shelves, pals };
  }, [query, allBooks, customShelves, readingLists]);

  const handleBookClick = (book) => {
    const userBook = myBooks.find(ub => ub.book_id === book.id);
    if (userBook) {
      navigate(`${createPageUrl("MyLibrary")}?bookId=${book.id}`);
    }
    setQuery("");
    setIsOpen(false);
  };

  const handleAuthorClick = (author) => {
    navigate(`${createPageUrl("Authors")}?author=${encodeURIComponent(author)}`);
    setQuery("");
    setIsOpen(false);
  };

  const handleShelfClick = () => {
    navigate(createPageUrl("MyLibrary") + "?tab=custom");
    setQuery("");
    setIsOpen(false);
  };

  const handlePALClick = () => {
    navigate(createPageUrl("MyLibrary") + "?tab=pal");
    setQuery("");
    setIsOpen(false);
  };

  const totalResults = searchResults.books.length + searchResults.authors.length + 
                       searchResults.shelves.length + searchResults.pals.length;

  return (
    <div ref={searchRef} className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 z-10" 
                style={{ color: '#FF69B4' }} />
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Rechercher livres, auteurs, PAL..."
          className="pl-10 pr-10 rounded-full border-2 transition-all"
          style={{ 
            borderColor: isOpen ? '#FF69B4' : '#FFD6E8',
            backgroundColor: 'white'
          }}
        />
        {query && (
          <button
            onClick={() => {
              setQuery("");
              setIsOpen(false);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2"
          >
            <X className="w-4 h-4" style={{ color: '#9CA3AF' }} />
          </button>
        )}
      </div>

      {isOpen && query.length >= 2 && (
        <div className="absolute top-full mt-2 w-full bg-white rounded-2xl shadow-2xl border-2 max-h-96 overflow-y-auto z-50"
             style={{ borderColor: '#FFD6E8' }}>
          {totalResults === 0 ? (
            <div className="p-6 text-center">
              <Search className="w-12 h-12 mx-auto mb-3 opacity-20" style={{ color: '#FF69B4' }} />
              <p className="text-sm" style={{ color: '#9CA3AF' }}>
                Aucun résultat trouvé
              </p>
            </div>
          ) : (
            <div className="p-2">
              {/* Books */}
              {searchResults.books.length > 0 && (
                <div className="mb-2">
                  <p className="text-xs font-bold px-3 py-2" style={{ color: '#FF69B4' }}>
                    📚 LIVRES
                  </p>
                  {searchResults.books.map(book => (
                    <button
                      key={book.id}
                      onClick={() => handleBookClick(book)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-pink-50 transition-colors"
                    >
                      <div className="w-10 h-14 rounded overflow-hidden flex-shrink-0" 
                           style={{ backgroundColor: '#FFD6E8' }}>
                        {book.cover_url ? (
                          <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <BookOpen className="w-5 h-5" style={{ color: '#FF69B4' }} />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <p className="font-bold text-sm line-clamp-1" style={{ color: '#2D3748' }}>
                          {book.title}
                        </p>
                        <p className="text-xs line-clamp-1" style={{ color: '#9CA3AF' }}>
                          {book.author}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Authors */}
              {searchResults.authors.length > 0 && (
                <div className="mb-2">
                  <p className="text-xs font-bold px-3 py-2" style={{ color: '#FF69B4' }}>
                    ✍️ AUTEURS
                  </p>
                  {searchResults.authors.map(author => (
                    <button
                      key={author}
                      onClick={() => handleAuthorClick(author)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-pink-50 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-full flex items-center justify-center"
                           style={{ backgroundColor: '#F3E5F5' }}>
                        <UserIcon className="w-5 h-5" style={{ color: '#9C27B0' }} />
                      </div>
                      <p className="font-medium text-sm" style={{ color: '#2D3748' }}>
                        {author}
                      </p>
                    </button>
                  ))}
                </div>
              )}

              {/* Custom Shelves */}
              {searchResults.shelves.length > 0 && (
                <div className="mb-2">
                  <p className="text-xs font-bold px-3 py-2" style={{ color: '#FF69B4' }}>
                    📖 ÉTAGÈRES
                  </p>
                  {searchResults.shelves.map(shelf => (
                    <button
                      key={shelf.id}
                      onClick={handleShelfClick}
                      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-pink-50 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-2xl">
                        {shelf.icon}
                      </div>
                      <p className="font-medium text-sm" style={{ color: '#2D3748' }}>
                        {shelf.name}
                      </p>
                    </button>
                  ))}
                </div>
              )}

              {/* PALs */}
              {searchResults.pals.length > 0 && (
                <div>
                  <p className="text-xs font-bold px-3 py-2" style={{ color: '#FF69B4' }}>
                    🎯 PAL
                  </p>
                  {searchResults.pals.map(pal => (
                    <button
                      key={pal.id}
                      onClick={handlePALClick}
                      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-pink-50 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-2xl">
                        {pal.icon}
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-medium text-sm" style={{ color: '#2D3748' }}>
                          {pal.name}
                        </p>
                        {pal.theme && (
                          <p className="text-xs" style={{ color: '#9CA3AF' }}>
                            {pal.theme}
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}