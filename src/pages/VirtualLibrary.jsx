
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Store } from "lucide-react";
import { toast } from "sonner";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const SPINE_COLORS = [
  { name: "Rose vif", hex: "#F58BA5", var: "--spine-rose" },
  { name: "Corail", hex: "#FF7F7F", var: "--spine-coral" },
  { name: "Pêche", hex: "#FFAB91", var: "--spine-peach" },
  { name: "Orange", hex: "#FFB347", var: "--spine-orange" },
  { name: "Rouge cerise", hex: "#DC143C", var: "--spine-cherry" },
  { name: "Saumon", hex: "#FA8072", var: "--spine-salmon" },
  { name: "Turquoise", hex: "#59C3C3", var: "--spine-teal" },
  { name: "Bleu ciel", hex: "#87CEEB", var: "--spine-sky" },
  { name: "Lavande", hex: "#B19CD9", var: "--spine-lavender" },
  { name: "Violet", hex: "#9B59B6", var: "--spine-violet" },
  { name: "Pervenche", hex: "#CCCCFF", var: "--spine-periwinkle" },
  { name: "Cyan", hex: "#00CED1", var: "--spine-cyan" },
  { name: "Beige", hex: "#EBDCCB", var: "--spine-beige" },
  { name: "Crème", hex: "#FFFACD", var: "--spine-cream" },
  { name: "Taupe", hex: "#B38B6D", var: "--spine-taupe" },
  { name: "Gris clair", hex: "#D3D3D3", var: "--spine-light-gray" },
  { name: "Lin", hex: "#E9DCC9", var: "--spine-linen" },
  { name: "Sable", hex: "#C2B280", var: "--spine-sand" },
  { name: "Marine", hex: "#1C2E4A", var: "--spine-navy" },
  { name: "Forêt", hex: "#2C5F2D", var: "--spine-forest" },
  { name: "Bordeaux", hex: "#800020", var: "--spine-wine" },
  { name: "Chocolat", hex: "#4E342E", var: "--spine-chocolate" },
  { name: "Anthracite", hex: "#36454F", var: "--spine-charcoal" },
  { name: "Noir", hex: "#1A1A1A", var: "--spine-black" },
];

const getRandomSpineColor = () => {
  return SPINE_COLORS[Math.floor(Math.random() * SPINE_COLORS.length)].hex;
};

const getContrastColor = (hexColor) => {
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 128 ? '#222222' : '#FFFFFF';
};

export default function VirtualLibrary() {
  const [user, setUser] = useState(null);
  const [draggedBookId, setDraggedBookId] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [openColorPicker, setOpenColorPicker] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: myBooks = [] } = useQuery({
    queryKey: ['myBooks'],
    queryFn: () => base44.entities.UserBook.filter({ created_by: user?.email }, 'shelf_position'),
    enabled: !!user,
  });

  const { data: allBooks = [] } = useQuery({
    queryKey: ['books'],
    queryFn: () => base44.entities.Book.list(),
  });

  const updateColorMutation = useMutation({
    mutationFn: async ({ bookId, color }) => {
      await base44.entities.UserBook.update(bookId, { book_color: color });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myBooks'] });
      toast.success("✨ Couleur mise à jour !", {
        duration: 2000,
        style: {
          background: 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))',
          color: 'white'
        }
      });
      setOpenColorPicker(null);
    },
  });

  const reorderBookMutation = useMutation({
    mutationFn: async ({ bookId, newPosition }) => {
      await base44.entities.UserBook.update(bookId, { shelf_position: newPosition });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myBooks'] });
    },
  });

  const readBooks = myBooks.filter(b => b.status === "Lu").sort((a, b) => (a.shelf_position || 0) - (b.shelf_position || 0));
  
  // Calculate books per shelf based on screen size
  const [booksPerShelf, setBooksPerShelf] = useState(14);
  
  useEffect(() => {
    const calculateBooksPerShelf = () => {
      const width = window.innerWidth;
      if (width < 640) return 6;  // mobile
      if (width < 768) return 8;  // tablet
      if (width < 1024) return 12; // small desktop
      return 14; // large desktop
    };
    
    setBooksPerShelf(calculateBooksPerShelf());
    
    const handleResize = () => setBooksPerShelf(calculateBooksPerShelf());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const shelves = Math.max(Math.ceil(readBooks.length / booksPerShelf), 3);

  useEffect(() => {
    if (readBooks.length > 0 && user) {
      readBooks.forEach(userBook => {
        if (!userBook.book_color) {
          const randomColor = getRandomSpineColor();
          updateColorMutation.mutate({ bookId: userBook.id, color: randomColor });
        }
      });
    }
  }, [readBooks.length, user]);

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
      await reorderBookMutation.mutateAsync({ 
        bookId: newBooks[i].id, 
        newPosition: i 
      });
    }

    toast.success("✨ Bibliothèque réorganisée !");
    setDraggedBookId(null);
    setDragOverIndex(null);
  };

  const handleColorChange = (userBookId, colorHex) => {
    requestAnimationFrame(() => {
      updateColorMutation.mutate({ bookId: userBookId, color: colorHex });
    });
  };

  return (
    <div className="p-3 md:p-8 min-h-screen" style={{ backgroundColor: 'var(--cream)' }}>
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 md:mb-8 gap-3 md:gap-4">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center shadow-md"
                 style={{ background: 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))' }}>
              <Store className="w-5 h-5 md:w-7 md:h-7 text-white" />
            </div>
            <div>
              <h1 className="text-xl md:text-3xl lg:text-4xl font-bold" style={{ color: 'var(--dark-text)' }}>
                Ma Bibliothèque Virtuelle
              </h1>
              <p className="text-sm md:text-lg font-medium" style={{ color: 'var(--deep-pink)' }}>
                {readBooks.length} livres lus • {shelves} étagère{shelves > 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>

        <div className="relative rounded-2xl p-3 md:p-8 shadow-xl" 
             style={{ 
               background: 'linear-gradient(to bottom, #FFF5F0, #FFF8F5)',
               minHeight: '400px'
             }}>
          <div className="space-y-6 md:space-y-8">
            {Array(shelves).fill(0).map((_, shelfNum) => {
              const startIndex = shelfNum * booksPerShelf;
              const endIndex = (shelfNum + 1) * booksPerShelf;
              const shelfBooks = readBooks.slice(startIndex, endIndex);
              
              return (
                <div key={shelfNum} className="relative">
                  <div className="min-h-[140px] md:min-h-[200px] rounded-lg shadow-lg flex items-end px-2 md:px-4 py-2 md:py-4 gap-1 md:gap-2 overflow-x-auto"
                       style={{ backgroundColor: '#8B4513' }}>
                    {shelfBooks.map((userBook, idx) => {
                      const book = allBooks.find(b => b.id === userBook.book_id);
                      const bookColor = userBook.book_color || "#FFB3D9";
                      const textColor = getContrastColor(bookColor);
                      const globalIndex = startIndex + idx;
                      const isColorPickerOpen = openColorPicker === userBook.id;
                      
                      return (
                        <Popover 
                          key={userBook.id || idx} 
                          open={isColorPickerOpen} 
                          onOpenChange={(open) => setOpenColorPicker(open ? userBook.id : null)}
                        >
                          <PopoverTrigger asChild>
                            <div 
                              draggable
                              onDragStart={(e) => handleDragStart(e, userBook.id)}
                              onDragOver={(e) => handleDragOver(e, globalIndex)}
                              onDrop={(e) => handleDrop(e, globalIndex)}
                              className={`w-12 h-[140px] md:w-16 md:h-[200px] rounded-sm shadow-md hover:shadow-xl transform hover:scale-105 transition-all flex flex-col items-center justify-center flex-shrink-0 cursor-pointer relative ${
                                dragOverIndex === globalIndex ? 'ring-4 ring-pink-400' : ''
                              }`}
                              style={{ 
                                backgroundColor: bookColor,
                                opacity: draggedBookId === userBook.id ? 0.5 : 1,
                                zIndex: isColorPickerOpen ? 50 : 10,
                                padding: '8px 0'
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenColorPicker(userBook.id);
                              }}
                              title={`${book?.title || 'Livre'} - ${book?.author || ''}`}
                            >
                              <div className="h-full flex items-center justify-center overflow-hidden"
                                   style={{
                                     writingMode: 'vertical-rl',
                                     textOrientation: 'mixed',
                                     transform: 'rotate(180deg)',
                                     width: '100%'
                                   }}>
                                <div className="flex flex-col items-center gap-1 md:gap-2">
                                  <p className="font-bold text-[10px] md:text-sm leading-tight whitespace-nowrap overflow-hidden text-ellipsis max-h-[110px] md:max-h-[150px] text-center"
                                     style={{ 
                                       color: textColor,
                                       fontWeight: 700,
                                       WebkitFontSmoothing: 'antialiased',
                                       textRendering: 'optimizeLegibility'
                                     }}>
                                    {book?.title || 'Livre'}
                                  </p>
                                  {book?.author && (
                                    <p className="text-[8px] md:text-xs opacity-80 whitespace-nowrap overflow-hidden text-ellipsis"
                                       style={{ color: textColor }}>
                                      {book.author}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </PopoverTrigger>
                          
                          <PopoverContent 
                            className="w-64 p-3 bg-white border-2" 
                            style={{ borderColor: 'var(--beige)' }}
                            align="start"
                            side="bottom"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="space-y-2">
                              <p className="text-xs font-bold mb-2" style={{ color: 'var(--dark-text)' }}>
                                🎨 Choisir une couleur
                              </p>
                              <div className="grid grid-cols-6 gap-1.5">
                                {SPINE_COLORS.map((color) => (
                                  <button
                                    key={color.hex}
                                    onClick={() => handleColorChange(userBook.id, color.hex)}
                                    className="w-8 h-8 rounded-md hover:scale-110 transition-transform focus:ring-2 focus:ring-offset-1"
                                    style={{ 
                                      backgroundColor: color.hex,
                                      outline: bookColor === color.hex ? '2px solid var(--deep-pink)' : 'none',
                                      outlineOffset: '2px'
                                    }}
                                    title={`${color.name} (${color.hex})`}
                                    aria-label={color.name}
                                  />
                                ))}
                              </div>
                              <div className="pt-2 border-t" style={{ borderColor: 'var(--beige)' }}>
                                <p className="text-xs" style={{ color: 'var(--warm-pink)' }}>
                                  Cliquez sur une couleur pour l'appliquer
                                </p>
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                      );
                    })}
                    {Array(Math.max(0, booksPerShelf - (shelfBooks.length))).fill(0).map((_, emptyIdx) => (
                      <div key={`empty-${shelfNum}-${emptyIdx}`} className="w-12 h-[140px] md:w-16 md:h-[200px] flex-shrink-0" />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-4 md:mt-6 p-3 md:p-6 rounded-xl text-center" style={{ backgroundColor: 'white' }}>
          <p className="text-sm md:text-lg" style={{ color: 'var(--dark-text)' }}>
            📚 <strong>Astuce :</strong> Glissez-déposez vos livres pour réorganiser votre bibliothèque !
            <br />
            <span className="text-xs md:text-sm" style={{ color: 'var(--warm-pink)' }}>
              Cliquez sur un livre pour changer sa couleur
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
