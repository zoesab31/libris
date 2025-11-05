import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ChevronLeft, Library, Search, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import BookDetailsDialog from "../components/library/BookDetailsDialog";
import { toast } from "sonner";

export default function ShelfView() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [sortBy, setSortBy] = useState("recent");
  const [searchQuery, setSearchQuery] = useState("");
  const [shelf, setShelf] = useState(null);
  const [selectedUserBook, setSelectedUserBook] = useState(null);
  const [draggedBookId, setDraggedBookId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
    const storedShelf = sessionStorage.getItem('currentShelf');
    if (storedShelf) {
      setShelf(JSON.parse(storedShelf));
    }
  }, []);

  const { data: myBooks = [] } = useQuery({
    queryKey: ['myBooks'],
    queryFn: () => base44.entities.UserBook.filter({ created_by: user?.email }),
    enabled: !!user,
  });

  const { data: allBooks = [] } = useQuery({
    queryKey: ['books'],
    queryFn: () => base44.entities.Book.list(),
  });

  const reorderBookMutation = useMutation({
    mutationFn: ({ bookId, position }) => 
      base44.entities.UserBook.update(bookId, { shelf_position: position }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myBooks'] });
    },
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

  const shelfBooks = myBooks.filter(b => b.custom_shelf === shelf.name);

  // Filter by search
  const filteredBooks = shelfBooks.filter(userBook => {
    const book = allBooks.find(b => b.id === userBook.book_id);
    if (!book) return false;
    const query = searchQuery.toLowerCase();
    return book.title.toLowerCase().includes(query) || 
           book.author.toLowerCase().includes(query);
  });

  // Sort books
  const sortedBooks = [...filteredBooks].sort((a, b) => {
    if (sortBy === "recent") {
      return new Date(b.updated_date) - new Date(a.updated_date);
    } else if (sortBy === "title") {
      const bookA = allBooks.find(book => book.id === a.book_id);
      const bookB = allBooks.find(book => book.id === b.book_id);
      return bookA?.title.localeCompare(bookB?.title);
    } else if (sortBy === "author") {
      const bookA = allBooks.find(book => book.id === a.book_id);
      const bookB = allBooks.find(book => book.id === b.book_id);
      return bookA?.author.localeCompare(bookB?.author);
    } else if (sortBy === "position") {
      return (a.shelf_position || 0) - (b.shelf_position || 0);
    }
    return 0;
  });

  const handleDragStart = (e, userBookId) => {
    setDraggedBookId(userBookId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, userBookId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverId(userBookId);
  };

  const handleDrop = async (e, dropOnBookId) => {
    e.preventDefault();
    
    if (!draggedBookId || draggedBookId === dropOnBookId) {
      setDraggedBookId(null);
      setDragOverId(null);
      return;
    }

    const draggedIndex = sortedBooks.findIndex(b => b.id === draggedBookId);
    const dropIndex = sortedBooks.findIndex(b => b.id === dropOnBookId);

    if (draggedIndex === -1 || dropIndex === -1) {
      setDraggedBookId(null);
      setDragOverId(null);
      return;
    }

    // Reorder
    const newBooks = [...sortedBooks];
    const [removed] = newBooks.splice(draggedIndex, 1);
    newBooks.splice(dropIndex, 0, removed);

    // Update positions
    const promises = newBooks.map((book, index) => 
      reorderBookMutation.mutateAsync({ bookId: book.id, position: index })
    );

    await Promise.all(promises);
    toast.success("Livres réorganisés !");

    setDraggedBookId(null);
    setDragOverId(null);
  };

  const avgRating = shelfBooks.filter(b => b.rating).length > 0
    ? (shelfBooks.filter(b => b.rating).reduce((sum, b) => sum + b.rating, 0) / shelfBooks.filter(b => b.rating).length).toFixed(1)
    : 0;

  return (
    <div className="p-4 md:p-8 min-h-screen" style={{ backgroundColor: 'var(--cream)' }}>
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <Link to={createPageUrl("MyLibrary")} className="inline-flex items-center gap-2 mb-4 hover:underline"
                style={{ color: 'var(--deep-pink)' }}>
            <ChevronLeft className="w-4 h-4" />
            Retour à Ma Bibliothèque
          </Link>

          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-xl flex items-center justify-center shadow-md text-4xl"
                 style={{ background: 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))' }}>
              {shelf.icon}
            </div>
            <div>
              <h1 className="text-3xl font-bold" style={{ color: 'var(--dark-text)' }}>
                {shelf.name}
              </h1>
              <p className="text-lg" style={{ color: 'var(--warm-pink)' }}>
                {shelfBooks.length} livre{shelfBooks.length > 1 ? 's' : ''}
                {avgRating > 0 && (
                  <span className="ml-2">• ⭐ {avgRating}/5</span>
                )}
              </p>
            </div>
          </div>

          {shelf.description && (
            <p className="text-sm mb-4" style={{ color: 'var(--dark-text)' }}>
              {shelf.description}
            </p>
          )}
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" 
                    style={{ color: 'var(--warm-pink)' }} />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher un livre..."
              className="pl-10"
            />
          </div>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder="Trier par..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="position">Ma disposition</SelectItem>
              <SelectItem value="recent">Plus récents</SelectItem>
              <SelectItem value="title">Titre (A-Z)</SelectItem>
              <SelectItem value="author">Auteur (A-Z)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Books Grid */}
        {sortedBooks.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {sortedBooks.map((userBook) => {
              const book = allBooks.find(b => b.id === userBook.book_id);
              if (!book) return null;

              return (
                <div 
                  key={userBook.id} 
                  draggable
                  onDragStart={(e) => handleDragStart(e, userBook.id)}
                  onDragOver={(e) => handleDragOver(e, userBook.id)}
                  onDrop={(e) => handleDrop(e, userBook.id)}
                  className={`group cursor-pointer ${dragOverId === userBook.id ? 'ring-4 ring-pink-400' : ''}`}
                  style={{ opacity: draggedBookId === userBook.id ? 0.5 : 1 }}
                  onClick={() => !draggedBookId && setSelectedUserBook(userBook)}
                >
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

      {/* Book Details Dialog */}
      {selectedUserBook && (
        <BookDetailsDialog
          userBook={selectedUserBook}
          book={allBooks.find(b => b.id === selectedUserBook.book_id)}
          open={!!selectedUserBook}
          onOpenChange={(open) => !open && setSelectedUserBook(null)}
        />
      )}
    </div>
  );
}