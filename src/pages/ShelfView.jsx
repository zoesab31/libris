import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useParams, Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ChevronLeft, Library } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import BookGrid from "../components/library/BookGrid";

export default function ShelfView() {
  const { shelfId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [sortBy, setSortBy] = useState("recent");

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: shelf, isLoading: loadingShelf } = useQuery({
    queryKey: ['shelf', shelfId],
    queryFn: async () => {
      const shelves = await base44.entities.CustomShelf.filter({ 
        created_by: user?.email 
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

  // Filter books for this shelf
  const shelfBooks = myBooks.filter(b => b.custom_shelf === shelf?.name);

  if (loadingShelf || !shelf) {
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

  return (
    <div className="p-4 md:p-8 min-h-screen" style={{ backgroundColor: 'var(--cream)' }}>
      <div className="max-w-7xl mx-auto">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 mb-6 text-sm">
          <Link 
            to={createPageUrl("MyLibrary")}
            className="hover:underline"
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

        {/* Shelf description */}
        {shelf.description && (
          <div className="mb-6 p-4 rounded-xl" style={{ backgroundColor: 'white' }}>
            <p style={{ color: 'var(--dark-text)' }}>{shelf.description}</p>
          </div>
        )}

        {/* Books Grid */}
        <BookGrid 
          userBooks={shelfBooks}
          allBooks={allBooks}
          customShelves={[shelf]}
          isLoading={loadingBooks}
          selectionMode={false}
          selectedBooks={[]}
          onSelectionChange={() => {}}
          onExitSelectionMode={() => {}}
        />
      </div>
    </div>
  );
}