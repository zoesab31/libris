import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ChevronLeft, Library, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import BookGrid from "../components/library/BookGrid";

export default function ShelfView() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [sortBy, setSortBy] = useState("recent");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Get shelf ID from URL params
  const urlParams = new URLSearchParams(window.location.search);
  const shelfId = urlParams.get('id');

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: shelf, isLoading: loadingShelf } = useQuery({
    queryKey: ['shelf', shelfId],
    queryFn: async () => {
      if (!user) return null;
      const shelves = await base44.entities.CustomShelf.filter({ 
        created_by: user.email 
      });
      return shelves.find(s => s.id === shelfId);
    },
    enabled: !!user && !!shelfId,
  });

  const { data: myBooks = [], isLoading: loadingBooks } = useQuery({
    queryKey: ['myBooks'],
    queryFn: () => base44.entities.UserBook.filter({ created_by: user?.email }),
    enabled: !!user,
  });

  const { data: allBooks = [] } = useQuery({
    queryKey: ['books'],
    queryFn: () => base44.entities.Book.list(),
  });

  const { data: customShelves = [] } = useQuery({
    queryKey: ['customShelves'],
    queryFn: () => base44.entities.CustomShelf.filter({ created_by: user?.email }),
    enabled: !!user,
  });

  // Filter books for this shelf
  let shelfBooks = myBooks.filter(b => b.custom_shelf === shelf?.name);

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

  // Loading state
  if (loadingShelf || !user) {
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

  // 404 - Shelf not found
  if (!shelf) {
    return (
      <div className="p-4 md:p-8 min-h-screen flex items-center justify-center" 
           style={{ backgroundColor: 'var(--cream)' }}>
        <div className="text-center max-w-md">
          <Library className="w-20 h-20 mx-auto mb-6 opacity-20" style={{ color: 'var(--warm-pink)' }} />
          <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--dark-text)' }}>
            Étagère introuvable
          </h2>
          <p className="text-lg mb-6" style={{ color: 'var(--warm-pink)' }}>
            Cette étagère n'existe pas ou vous n'y avez pas accès.
          </p>
          <Link to={createPageUrl("MyLibrary")}>
            <Button
              className="text-white font-medium"
              style={{ background: 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))' }}
            >
              Retour à la bibliothèque
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 min-h-screen" style={{ backgroundColor: 'var(--cream)' }}>
      <div className="max-w-7xl mx-auto">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 mb-6 text-sm">
          <Link 
            to={createPageUrl("MyLibrary") + "?tab=custom"}
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
              onClick={() => navigate(createPageUrl("MyLibrary") + "?tab=custom")}
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
          <BookGrid 
            userBooks={shelfBooks}
            allBooks={allBooks}
            customShelves={customShelves}
            isLoading={loadingBooks}
            selectionMode={false}
            selectedBooks={[]}
            onSelectionChange={() => {}}
            onExitSelectionMode={() => {}}
          />
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