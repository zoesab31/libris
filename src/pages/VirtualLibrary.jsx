import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Store, BookOpen, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";

export default function VirtualLibrary() {
  const [user, setUser] = useState(null);
  const [draggedBookId, setDraggedBookId] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [shelfColor, setShelfColor] = useState("#8B4513");
  const queryClient = useQueryClient();

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: myBooks = [] } = useQuery({
    queryKey: ['myBooksForDisplay'],
    queryFn: () => base44.entities.UserBook.filter({ created_by: user?.email }, 'shelf_position'),
    enabled: !!user,
  });

  const { data: allBooks = [] } = useQuery({
    queryKey: ['books'],
    queryFn: () => base44.entities.Book.list(),
  });

  const updateBookColorMutation = useMutation({
    mutationFn: ({ bookId, color }) => base44.entities.UserBook.update(bookId, { book_color: color }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myBooksForDisplay'] });
    },
  });

  const reorderBooksMutation = useMutation({
    mutationFn: async ({ bookId, newPosition }) => {
      await base44.entities.UserBook.update(bookId, { shelf_position: newPosition });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myBooksForDisplay'] });
    },
  });

  const updateGenresMutation = useMutation({
    mutationFn: async ({ bookId, genres }) => {
      await base44.entities.Book.update(bookId, { custom_genres: genres });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
      toast.success("Genres mis à jour !");
    },
  });

  const readBooks = myBooks.filter(b => b.status === "Lu");
  const shelves = Math.max(Math.ceil(readBooks.length / 12), 3);

  const handleDragStart = (e, userBookId) => {
    setDraggedBookId(userBookId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDrop = async (e, dropIndex) => {
    e.preventDefault();
    
    if (!draggedBookId) return;

    const draggedIndex = readBooks.findIndex(b => b.id === draggedBookId);
    if (draggedIndex === -1 || draggedIndex === dropIndex) {
      setDraggedBookId(null);
      setDragOverIndex(null);
      return;
    }

    const newBooks = [...readBooks];
    const [removed] = newBooks.splice(draggedIndex, 1);
    newBooks.splice(dropIndex, 0, removed);

    for (let i = 0; i < newBooks.length; i++) {
      await reorderBooksMutation.mutateAsync({ 
        bookId: newBooks[i].id, 
        newPosition: i 
      });
    }

    setDraggedBookId(null);
    setDragOverIndex(null);
  };

  const handleColorChange = (userBookId, color) => {
    requestAnimationFrame(() => {
      updateBookColorMutation.mutate({ bookId: userBookId, color });
    });
  };

  const handleShelfColorChange = (color) => {
    requestAnimationFrame(() => {
      setShelfColor(color);
    });
  };

  return (
    <div className="p-4 md:p-8 min-h-screen" style={{ backgroundColor: 'var(--cream)' }}>
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-md"
                 style={{ background: 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))' }}>
              <Store className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold" style={{ color: 'var(--dark-text)' }}>
                Ma Bibliothèque Virtuelle
              </h1>
              <p className="text-lg font-medium" style={{ color: 'var(--deep-pink)' }}>
                {readBooks.length} livres lus • {shelves} étagère{shelves > 1 ? 's' : ''}
              </p>
            </div>
          </div>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button
                size="icon"
                className="shadow-lg w-9 h-9"
                style={{ backgroundColor: shelfColor, color: 'white', zIndex: 100 }}
                title="Changer la couleur des étagères"
              >
                <Palette className="w-5 h-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64">
              <div className="space-y-3">
                <Label className="text-sm font-bold">Couleur des étagères</Label>
                <input
                  type="color"
                  value={shelfColor}
                  onChange={(e) => handleShelfColorChange(e.target.value)}
                  className="w-full h-12 rounded-lg cursor-pointer border-2"
                  style={{ borderColor: 'var(--beige)' }}
                />
                <div className="grid grid-cols-4 gap-2">
                  {['#8B4513', '#654321', '#A0522D', '#D2691E', '#8B7355', '#6B4423', '#3D2817', '#704214'].map(color => (
                    <button
                      key={color}
                      onClick={() => handleShelfColorChange(color)}
                      className="w-full h-8 rounded-lg border-2 hover:scale-110 transition-transform"
                      style={{ backgroundColor: color, borderColor: shelfColor === color ? 'var(--deep-pink)' : 'transparent' }}
                    />
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        <div className="relative rounded-2xl p-8 shadow-xl" 
             style={{ 
               background: 'linear-gradient(to bottom, #FFF5F0, #FFF8F5)',
               minHeight: '600px'
             }}>
          <div className="space-y-8">
            {Array(shelves).fill(0).map((_, shelfNum) => (
              <div key={shelfNum} className="relative">
                <div className="min-h-[200px] rounded-lg shadow-lg flex items-end p-4 gap-2 overflow-x-auto"
                     style={{ backgroundColor: shelfColor }}>
                  {readBooks.slice(shelfNum * 12, (shelfNum + 1) * 12).map((userBook, idx) => {
                    const book = allBooks.find(b => b.id === userBook.book_id);
                    const bookColor = userBook.book_color || "#FFB3D9";
                    const globalIndex = shelfNum * 12 + idx;
                    
                    return (
                      <div 
                        key={userBook.id || idx}
                        draggable
                        onDragStart={(e) => handleDragStart(e, userBook.id)}
                        onDragOver={(e) => handleDragOver(e, globalIndex)}
                        onDrop={(e) => handleDrop(e, globalIndex)}
                        className={`w-16 h-[180px] rounded-sm shadow-md hover:shadow-xl transform hover:scale-105 transition-all flex flex-col items-center justify-center p-2 flex-shrink-0 cursor-move relative group ${
                          dragOverIndex === globalIndex ? 'ring-4 ring-pink-400' : ''
                        }`}
                        style={{ 
                          backgroundColor: bookColor,
                          opacity: draggedBookId === userBook.id ? 0.5 : 1,
                          zIndex: 10
                        }}
                      >
                        <div className="absolute inset-0 flex items-center justify-center p-2">
                          <div className="transform -rotate-90 whitespace-nowrap">
                            <p className="text-sm font-bold text-white leading-tight mb-1 max-w-[160px] truncate"
                               title={book?.title || 'Livre'}>
                              {book?.title || 'Livre'}
                            </p>
                            <p className="text-xs text-white opacity-90 text-center">
                              {book?.author || ''}
                            </p>
                          </div>
                        </div>
                        
                        <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-50">
                          <div className="bg-white p-3 rounded-xl shadow-2xl border-2 min-w-[200px]" 
                               style={{ borderColor: 'var(--soft-pink)' }}>
                            <p className="text-xs font-bold mb-2" style={{ color: 'var(--deep-pink)' }}>
                              🎨 Couleur
                            </p>
                            <input 
                              type="color" 
                              value={bookColor}
                              onChange={(e) => handleColorChange(userBook.id, e.target.value)}
                              className="w-full h-10 rounded-lg cursor-pointer border-2"
                              style={{ borderColor: 'var(--soft-pink)' }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 p-6 rounded-xl text-center" style={{ backgroundColor: 'white' }}>
          <p className="text-lg" style={{ color: 'var(--dark-text)' }}>
            📚 <strong>Astuce :</strong> Glissez-déposez vos livres pour réorganiser votre bibliothèque !
            <br />
            <span className="text-sm" style={{ color: 'var(--warm-pink)' }}>
              Utilisez le bouton palette pour changer la couleur des étagères
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}