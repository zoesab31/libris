import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ChevronLeft, Library, Search, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ShelfView() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [sortBy, setSortBy] = useState("recent");
  const [searchQuery, setSearchQuery] = useState("");
  const [shelf, setShelf] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
    
    // Get shelf from sessionStorage
    const storedShelf = sessionStorage.getItem('currentShelf');
    if (storedShelf) {
      try {
        setShelf(JSON.parse(storedShelf));
      } catch (e) {
        console.error("Error parsing shelf data:", e);
      }
    }
  }, []);

  const { data: myBooks = [], isLoading: loadingBooks } = useQuery({
    queryKey: ['myBooks'],
    queryFn: () => base44.entities.UserBook.filter({ created_by: user?.email }),
    enabled: !!user,
  });

  const { data: allBooks = [] } = useQuery({
    queryKey: ['books'],
    queryFn: () => base44.entities.Book.list(),
  });

  if (!user || !shelf) {
    return (
      <div className="p-4 md:p-8 min-h-screen flex items-center justify-center" 
           style={{ backgroundColor: 'var(--cream)' }}>
        <div className="text-center">
          <Library className="w-16 h-16 mx-auto mb-4 opacity-20" style={{ color: 'var(--warm-pink)' }} />
          <p className="text-lg" style={{ color: 'var(--dark-text)' }}>
            Chargement de l'étagère...
          </p>
        </div>
      </div>
    );
  }

  // Filter books for this shelf
  let shelfBooks = myBooks.filter(b => b.custom_shelf === shelf.name);

  // Apply search
  if (searchQuery) {
    shelfBooks = shelfBooks.filter(userBook => {
      const book = allBooks.find(b => b.id === userBook.book_id);
      return book?.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
             book?.author.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }

  // Apply sort
  switch (sortBy) {
    case "recent":
      shelfBooks = [...shelfBooks].sort((a, b) => 
        new Date(b.created_date || 0) - new Date(a.created_date || 0)
      );
      break;
    case "rating":
      shelfBooks = [...shelfBooks].sort((a, b) => 
        (b.rating || 0) - (a.rating || 0)
      );
      break;
    case "title":
      shelfBooks = [...shelfBooks].sort((a, b) => {
        const bookA = allBooks.find(book => book.id === a.book_id);
        const bookB = allBooks.find(book => book.id === b.book_id);
        return (bookA?.title || '').localeCompare(bookB?.title || '');
      });
      break;
  }

  return (
    <div className="p-4 md:p-8 min-h-screen" style={{ backgroundColor: 'var(--cream)' }}>
      <div className="max-w-7xl mx-auto">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 mb-6 text-sm">
          <Link 
            to={createPageUrl("MyLibrary")}
            className="hover:underline transition-all"
            style={{ color: 'var(--warm-pink)' }}
          >
            Ma Bibliothèque
          </Link>
          <ChevronLeft className="w-4 h-4 rotate-180" style={{ color: 'var(--warm-pink)' }} />
          <span className="font-medium" style={{ color: 'var(--dark-text)' }}>
            {shelf.icon} {shelf.name}
          </span>
        </div>

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(createPageUrl("MyLibrary"))}
              className="shadow-md"
              style={{ backgroundColor: 'white' }}
            >
              <ChevronLeft className="w-5 h-5" style={{ color: 'var(--deep-pink)' }} />
            </Button>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold flex items-center gap-3" 
                  style={{ color: 'var(--dark-text)' }}>
                <span className="text-4xl">{shelf.icon}</span>
                {shelf.name}
              </h1>
              <p className="text-lg" style={{ color: 'var(--warm-pink)' }}>
                {shelfBooks.length} livre{shelfBooks.length > 1 ? 's' : ''}
              </p>
            </div>
          </div>

          <div className="flex gap-3 w-full md:w-auto">
            <div className="flex-1 md:flex-initial relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" 
                      style={{ color: 'var(--warm-pink)' }} />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher..."
                className="pl-10 bg-white border-2"
                style={{ borderColor: 'var(--beige)' }}
              />
            </div>
            
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-48 bg-white border-2" style={{ borderColor: 'var(--beige)' }}>
                <SelectValue placeholder="Trier par" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Plus récents</SelectItem>
                <SelectItem value="rating">Note (meilleure d'abord)</SelectItem>
                <SelectItem value="title">Titre (A-Z)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Shelf description */}
        {shelf.description && (
          <div className="mb-6 p-4 rounded-xl border-2" 
               style={{ backgroundColor: 'white', borderColor: 'var(--beige)' }}>
            <p style={{ color: 'var(--dark-text)' }}>{shelf.description}</p>
          </div>
        )}

        {/* Books Grid */}
        {shelfBooks.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {shelfBooks.map((userBook) => {
              const book = allBooks.find(b => b.id === userBook.book_id);
              if (!book) return null;

              return (
                <div key={userBook.id} className="group cursor-pointer">
                  <div className="relative mb-3">
                    <div className="w-full aspect-[2/3] rounded-xl overflow-hidden shadow-lg 
                                  transition-all duration-300 group-hover:shadow-2xl group-hover:-translate-y-2"
                         style={{ backgroundColor: 'var(--beige)' }}>
                      {book.cover_url ? (
                        <img 
                          src={book.cover_url} 
                          alt={book.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <BookOpen className="w-12 h-12" style={{ color: 'var(--warm-pink)' }} />
                        </div>
                      )}
                    </div>
                  </div>

                  <h3 className="font-bold text-sm mb-1 line-clamp-2 group-hover:underline" 
                      style={{ color: 'var(--dark-text)' }}>
                    {book.title}
                  </h3>
                  <p className="text-xs line-clamp-1" style={{ color: 'var(--warm-pink)' }}>
                    {book.author}
                  </p>
                  {userBook.rating && (
                    <p className="text-xs mt-1 font-bold" style={{ color: 'var(--gold)' }}>
                      ⭐ {userBook.rating}/5
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-20 rounded-2xl" style={{ backgroundColor: 'white' }}>
            <Library className="w-20 h-20 mx-auto mb-6 opacity-20" style={{ color: 'var(--warm-pink)' }} />
            <h3 className="text-2xl font-bold mb-2" style={{ color: 'var(--dark-text)' }}>
              {searchQuery ? "Aucun résultat" : "Étagère vide"}
            </h3>
            <p className="text-lg mb-6" style={{ color: 'var(--warm-pink)' }}>
              {searchQuery 
                ? "Aucun livre ne correspond à votre recherche" 
                : "Ajoutez des livres à cette étagère depuis Ma Bibliothèque"
              }
            </p>
            <Link to={createPageUrl("MyLibrary")}>
              <Button
                className="text-white font-medium"
                style={{ background: 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))' }}
              >
                Aller à Ma Bibliothèque
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}