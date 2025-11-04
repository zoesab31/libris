import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Store, Sparkles, BookOpen, Star } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

const DECOR_ITEMS = [
  { id: "plant1", name: "Plante verte", price: 50, emoji: "🌿", category: "deco" },
  { id: "plant2", name: "Cactus", price: 30, emoji: "🌵", category: "deco" },
  { id: "lamp1", name: "Lampe dorée", price: 100, emoji: "💡", category: "deco" },
  { id: "frame1", name: "Cadre photo", price: 40, emoji: "🖼️", category: "deco" },
  { id: "rug1", name: "Tapis rose", price: 80, emoji: "🟥", category: "deco" },
  { id: "chair1", name: "Fauteuil cosy", price: 150, emoji: "🛋️", category: "furniture" },
  { id: "shelf1", name: "Étagère supplémentaire", price: 200, emoji: "📚", category: "furniture" },
  { id: "desk1", name: "Bureau vintage", price: 180, emoji: "🪑", category: "furniture" },
];

export default function VirtualLibrary() {
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: points } = useQuery({
    queryKey: ['readingPoints'],
    queryFn: async () => {
      const result = await base44.entities.ReadingPoints.filter({ created_by: user?.email });
      return result[0] || { total_points: 0, points_spent: 0 };
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
    queryFn: () => base44.entities.UserBook.filter({ created_by: user?.email }),
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

  const availablePoints = (points?.total_points || 0) - (points?.points_spent || 0);
  const readBooks = myBooks.filter(b => b.status === "Lu");

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
            <div className="relative rounded-2xl p-8 shadow-xl" 
                 style={{ 
                   background: 'linear-gradient(to bottom, #FFE4E1, #FFF0F5)',
                   minHeight: '600px'
                 }}>
              {/* Shelves */}
              <div className="space-y-8">
                {[0, 1, 2].map((shelfNum) => (
                  <div key={shelfNum} className="relative">
                    <div className="h-32 rounded-lg shadow-lg flex items-end p-4 gap-2"
                         style={{ backgroundColor: '#8B4513' }}>
                      {readBooks.slice(shelfNum * 10, (shelfNum + 1) * 10).map((userBook, idx) => {
                        const book = allBooks.find(b => b.id === userBook.book_id);
                        return (
                          <div key={idx} 
                               className="w-16 h-24 rounded-sm shadow-md transform hover:scale-110 transition-transform"
                               style={{ backgroundColor: book?.cover_url ? 'transparent' : 'var(--soft-pink)' }}>
                            {book?.cover_url ? (
                              <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover rounded-sm" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <BookOpen className="w-6 h-6 text-white" />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Decorations */}
              <div className="absolute inset-0 pointer-events-none">
                {myDecor.map((decor, idx) => {
                  const item = DECOR_ITEMS.find(i => i.id === decor.decor_id);
                  return (
                    <div key={idx}
                         className="absolute text-4xl"
                         style={{
                           left: `${(idx * 15 + 10) % 80}%`,
                           top: `${(idx * 20 + 10) % 80}%`,
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
                <li className="font-medium">• Ajouter un livre : +10 points</li>
                <li className="font-medium">• Terminer un livre : +50 points</li>
                <li className="font-medium">• Écrire un commentaire : +5 points</li>
                <li className="font-medium">• Compléter un défi bingo : +20 points</li>
              </ul>
            </div>
          </TabsContent>

          <TabsContent value="shop">
            <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-4">
              {DECOR_ITEMS.map((item) => {
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