
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Store, BookOpen, Plus, Settings } from "lucide-react";
import { toast } from "sonner";
import DecorationShop from "../components/decorations/DecorationShop";
import { Button } from "@/components/ui/button"; // Assuming Button component from a UI library

export default function VirtualLibrary() {
  const [user, setUser] = useState(null);
  const [draggedBookId, setDraggedBookId] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const queryClient = useQueryClient();
  const [showDecorationShop, setShowDecorationShop] = useState(false);

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
      toast.success("Couleur enregistrée !");
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

  const readBooks = myBooks.filter(b => b.status === "Lu");
  // Calculate number of shelves needed (15 books per shelf, minimum 3 shelves)
  const shelves = Math.max(Math.ceil(readBooks.length / 15), 3);

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

    // Reorder books
    const newBooks = [...readBooks];
    const [removed] = newBooks.splice(draggedIndex, 1);
    newBooks.splice(dropIndex, 0, removed);

    // Update positions
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
    updateBookColorMutation.mutate({ bookId: userBookId, color });
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
          
          <div className="flex gap-3">
            <Button 
              onClick={() => setShowDecorationShop(true)}
              className="shadow-lg text-white font-medium px-6 rounded-xl"
              style={{ background: 'linear-gradient(135deg, var(--gold), var(--warm-pink))' }}>
              <Plus className="w-5 h-5 mr-2" />
              Boutique
            </Button>
          </div>
        </div>

        <div className="relative rounded-2xl p-8 shadow-xl" 
             style={{ 
               background: 'linear-gradient(to bottom, #FFE4E1, #FFF0F5)',
               minHeight: '600px'
             }}>
          <div className="space-y-8">
            {Array(shelves).fill(0).map((_, shelfNum) => (
              <div key={shelfNum} className="relative">
                <div className="min-h-[220px] rounded-lg shadow-lg flex items-end p-4 gap-3 overflow-x-auto"
                     style={{ backgroundColor: '#8B4513' }}>
                  {/* Books */}
                  {readBooks.slice(shelfNum * 15, (shelfNum + 1) * 15).map((userBook, idx) => {
                    const book = allBooks.find(b => b.id === userBook.book_id);
                    const bookColor = userBook.book_color || "#FFB3D9";
                    const globalIndex = shelfNum * 15 + idx;
                    
                    return (
                      <div 
                        key={userBook.id || idx}
                        draggable
                        onDragStart={(e) => handleDragStart(e, userBook.id)}
                        onDragOver={(e) => handleDragOver(e, globalIndex)}
                        onDrop={(e) => handleDrop(e, globalIndex)}
                        className={`w-20 h-48 rounded-sm shadow-md hover:shadow-xl transform hover:scale-105 transition-all flex flex-col items-center justify-center p-2 flex-shrink-0 cursor-move relative group ${
                          dragOverIndex === globalIndex ? 'ring-4 ring-pink-400' : ''
                        }`}
                        style={{ 
                          backgroundColor: bookColor,
                          opacity: draggedBookId === userBook.id ? 0.5 : 1,
                          zIndex: 10
                        }}
                      >
                        {/* Vertical text on book spine */}
                        <div className="absolute inset-0 flex items-center justify-center p-2">
                          <div className="transform -rotate-90 whitespace-nowrap">
                            <p className="text-xs font-bold text-white leading-tight mb-1 max-w-[180px] truncate">
                              {book?.title || 'Livre'}
                            </p>
                            <p className="text-[10px] text-white opacity-90 text-center">
                              {book?.author || ''}
                            </p>
                          </div>
                        </div>
                        
                        {/* Color picker - BELOW the book */}
                        <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-50">
                          <div className="bg-white p-2 rounded-xl shadow-2xl border-2" 
                               style={{ borderColor: 'var(--soft-pink)' }}>
                            <label className="flex flex-col items-center gap-1 cursor-pointer">
                              <span className="text-xs font-bold whitespace-nowrap" style={{ color: 'var(--deep-pink)' }}>
                                🎨
                              </span>
                              <input 
                                type="color" 
                                value={bookColor}
                                onChange={(e) => handleColorChange(userBook.id, e.target.value)}
                                className="w-12 h-12 rounded-lg cursor-pointer border-2"
                                style={{ borderColor: 'var(--soft-pink)' }}
                              />
                            </label>
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
              Les étagères s'ajoutent automatiquement quand vous avez plus de 15 livres par étagère
            </span>
          </p>
        </div>

        <DecorationShop 
          open={showDecorationShop}
          onOpenChange={setShowDecorationShop}
          user={user}
        />
      </div>
    </div>
  );
}
