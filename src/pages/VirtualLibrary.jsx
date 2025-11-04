import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Store, Sparkles, BookOpen, Star, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const DECOR_ITEMS = [
  // Fantasy
  { id: "dagger", name: "Dague enchantée", price: 80, emoji: "🗡️", category: "fantasy" },
  { id: "dragon", name: "Dragon miniature", price: 150, emoji: "🐉", category: "fantasy" },
  { id: "sword", name: "Épée légendaire", price: 120, emoji: "⚔️", category: "fantasy" },
  { id: "grimoire", name: "Grimoire ancien", price: 100, emoji: "📜", category: "fantasy" },
  { id: "crystal", name: "Cristal magique", price: 70, emoji: "💎", category: "fantasy" },
  
  // Romance
  { id: "roses", name: "Bouquet de roses", price: 60, emoji: "🌹", category: "romance" },
  { id: "lights", name: "Guirlande lumineuse", price: 90, emoji: "💡", category: "romance" },
  { id: "candles", name: "Bougies parfumées", price: 50, emoji: "🕯️", category: "romance" },
  { id: "heart", name: "Coeur décoratif", price: 40, emoji: "💖", category: "romance" },
  { id: "mirror", name: "Miroir vintage", price: 110, emoji: "🪞", category: "romance" },
  
  // Dark Romance
  { id: "skull", name: "Crâne décoratif", price: 80, emoji: "💀", category: "dark" },
  { id: "raven", name: "Corbeau noir", price: 90, emoji: "🦅", category: "dark" },
  { id: "chains", name: "Chaînes gothiques", price: 70, emoji: "⛓️", category: "dark" },
  { id: "moon", name: "Lune noire", price: 85, emoji: "🌑", category: "dark" },
  { id: "rose_black", name: "Rose noire", price: 60, emoji: "🥀", category: "dark" },
  
  // Botanique
  { id: "plant1", name: "Plante verte", price: 50, emoji: "🌿", category: "botanique" },
  { id: "cactus", name: "Cactus", price: 30, emoji: "🌵", category: "botanique" },
  { id: "flowers", name: "Bouquet champêtre", price: 55, emoji: "🌸", category: "botanique" },
  { id: "ivy", name: "Lierre grimpant", price: 65, emoji: "🍃", category: "botanique" },
  { id: "terrarium", name: "Terrarium", price: 95, emoji: "🪴", category: "botanique" },
];

export default function VirtualLibrary() {
  const [user, setUser] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [draggedBookId, setDraggedBookId] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const queryClient = useQueryClient();

  React.useEffect(() => {
    base44.auth.me().then(async (u) => {
      setUser(u);
      
      // Give 20000 points if user doesn't have any
      const existingPoints = await base44.entities.ReadingPoints.filter({ created_by: u.email });
      if (existingPoints.length === 0) {
        await base44.entities.ReadingPoints.create({ 
          total_points: 20000, 
          points_spent: 0 
        });
      }
    }).catch(() => {});
  }, []);

  const { data: points, refetch: refetchPoints } = useQuery({
    queryKey: ['readingPoints'],
    queryFn: async () => {
      const result = await base44.entities.ReadingPoints.filter({ created_by: user?.email });
      return result[0] || { total_points: 20000, points_spent: 0 };
    },
    enabled: !!user,
  });

  const { data: myDecor = [] } = useQuery({
    queryKey: ['myDecor'],
    queryFn: () => base44.entities.LibraryDecor.filter({ created_by: user?.email }),
    enabled: !!user,
  });

  const { data: myBooks = [] } = useQuery({
    queryKey: ['myBooksForDisplay'],
    queryFn: () => base44.entities.UserBook.filter({ created_by: user?.email }, 'shelf_position'),
    enabled: !!user,
  });

  const { data: allBooks = [] } = useQuery({
    queryKey: ['books'],
    queryFn: () => base44.entities.Book.list(),
  });

  const buyDecorMutation = useMutation({
    mutationFn: async (item) => {
      const availablePoints = (points.total_points || 0) - (points.points_spent || 0);
      if (availablePoints < item.price) {
        throw new Error("Pas assez de points !");
      }

      await base44.entities.LibraryDecor.create({
        decor_id: item.id,
        name: item.name,
      });

      await base44.entities.ReadingPoints.update(points.id, {
        points_spent: (points.points_spent || 0) + item.price
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['readingPoints'] });
      queryClient.invalidateQueries({ queryKey: ['myDecor'] });
      toast.success("Décoration achetée ! 🎉");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const addShelfMutation = useMutation({
    mutationFn: async () => {
      const availablePoints = (points.total_points || 0) - (points.points_spent || 0);
      const shelfPrice = 200;
      if (availablePoints < shelfPrice) {
        throw new Error("Pas assez de points !");
      }

      await base44.entities.LibraryDecor.create({
        decor_id: `shelf_${Date.now()}`,
        name: "Étagère supplémentaire",
      });

      await base44.entities.ReadingPoints.update(points.id, {
        points_spent: (points.points_spent || 0) + shelfPrice
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['readingPoints'] });
      queryClient.invalidateQueries({ queryKey: ['myDecor'] });
      toast.success("Étagère ajoutée ! 🎉");
    },
    onError: (error) => {
      toast.error(error.message);
    },
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

  const availablePoints = (points?.total_points || 0) - (points?.points_spent || 0);
  const readBooks = myBooks.filter(b => b.status === "Lu");
  
  const shelves = myDecor.filter(d => d.decor_id.startsWith('shelf')).length + 3;
  const decorations = myDecor.filter(d => !d.decor_id.startsWith('shelf'));

  const filteredItems = selectedCategory === "all" 
    ? DECOR_ITEMS 
    : DECOR_ITEMS.filter(item => item.category === selectedCategory);

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
        <div className="flex items-center justify-between mb-8">
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
                {readBooks.length} livres lus • {availablePoints} points disponibles ⭐
              </p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="library" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="library" className="font-medium">
              <BookOpen className="w-4 h-4 mr-2" />
              Ma Bibliothèque
            </TabsTrigger>
            <TabsTrigger value="shop" className="font-medium">
              <Store className="w-4 h-4 mr-2" />
              Boutique
            </TabsTrigger>
          </TabsList>

          <TabsContent value="library">
            <div className="mb-4 flex gap-3">
              <Button
                onClick={() => addShelfMutation.mutate()}
                disabled={availablePoints < 200 || addShelfMutation.isPending}
                className="text-white font-medium"
                style={{ background: 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))' }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Ajouter une étagère (200 pts)
              </Button>
            </div>

            <div className="relative rounded-2xl p-8 shadow-xl" 
                 style={{ 
                   background: 'linear-gradient(to bottom, #FFE4E1, #FFF0F5)',
                   minHeight: '600px'
                 }}>
              <div className="space-y-8">
                {Array(shelves).fill(0).map((_, shelfNum) => (
                  <div key={shelfNum} className="relative">
                    <div className="min-h-[200px] rounded-lg shadow-lg flex items-end p-4 gap-3 overflow-x-auto"
                         style={{ backgroundColor: '#8B4513' }}>
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
                              opacity: draggedBookId === userBook.id ? 0.5 : 1
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
                            
                            {/* Color picker - ALWAYS visible above the book */}
                            <div className="absolute -top-20 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-50">
                              <div className="bg-white p-4 rounded-2xl shadow-2xl border-4" 
                                   style={{ borderColor: 'var(--soft-pink)' }}>
                                <label className="flex flex-col items-center gap-3 cursor-pointer">
                                  <span className="text-sm font-bold whitespace-nowrap" style={{ color: 'var(--deep-pink)' }}>
                                    🎨 Changer la couleur
                                  </span>
                                  <input 
                                    type="color" 
                                    value={bookColor}
                                    onChange={(e) => handleColorChange(userBook.id, e.target.value)}
                                    className="w-20 h-20 rounded-xl cursor-pointer border-4"
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

              <div className="absolute inset-0 pointer-events-none">
                {decorations.map((decor, idx) => {
                  const item = DECOR_ITEMS.find(i => i.id === decor.decor_id);
                  return (
                    <div key={decor.id || idx}
                         className="absolute text-5xl cursor-move pointer-events-auto"
                         style={{
                           left: decor.position_x ? `${decor.position_x}%` : `${(idx * 18 + 5) % 85}%`,
                           top: decor.position_y ? `${decor.position_y}%` : `${(idx * 25 + 5) % 80}%`,
                         }}>
                      {item?.emoji}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-6 p-6 rounded-xl" style={{ backgroundColor: 'white' }}>
              <h3 className="text-xl font-bold mb-4" style={{ color: 'var(--dark-text)' }}>
                💡 Comment gagner des points ?
              </h3>
              <ul className="space-y-2" style={{ color: 'var(--deep-pink)' }}>
                <li className="font-medium">• Terminer un livre : +50 points</li>
                <li className="font-medium">• Écrire un commentaire : +5 points</li>
                <li className="font-medium">• Compléter un défi bingo : +20 points</li>
                <li className="font-medium">• Voter livre du mois : +10 points</li>
              </ul>
            </div>
          </TabsContent>

          <TabsContent value="shop">
            <div className="mb-6">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Catégorie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les catégories</SelectItem>
                  <SelectItem value="fantasy">⚔️ Fantasy</SelectItem>
                  <SelectItem value="romance">💖 Romance</SelectItem>
                  <SelectItem value="dark">💀 Dark Romance</SelectItem>
                  <SelectItem value="botanique">🌿 Botanique</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredItems.map((item) => {
                const owned = myDecor.some(d => d.decor_id === item.id);
                const canAfford = availablePoints >= item.price;

                return (
                  <Card key={item.id} className="shadow-lg border-2 hover:shadow-xl transition-all"
                        style={{ 
                          backgroundColor: 'white',
                          borderColor: owned ? 'var(--gold)' : 'var(--soft-pink)',
                          opacity: owned ? 0.6 : 1
                        }}>
                    <CardContent className="p-6 text-center">
                      <div className="text-6xl mb-4">{item.emoji}</div>
                      <h3 className="font-bold mb-2" style={{ color: 'var(--dark-text)' }}>
                        {item.name}
                      </h3>
                      <div className="flex items-center justify-center gap-1 mb-4">
                        <Star className="w-4 h-4" style={{ color: 'var(--gold)' }} />
                        <span className="font-bold" style={{ color: 'var(--deep-pink)' }}>
                          {item.price} pts
                        </span>
                      </div>
                      <Button
                        onClick={() => buyDecorMutation.mutate(item)}
                        disabled={owned || !canAfford || buyDecorMutation.isPending}
                        className="w-full text-white"
                        style={{ background: owned ? '#ccc' : 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))' }}
                      >
                        {owned ? "✓ Possédé" : canAfford ? "Acheter" : "Pas assez de pts"}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}