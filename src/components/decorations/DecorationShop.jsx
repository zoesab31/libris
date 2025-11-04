import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Coins, ShoppingBag, Check } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const DECORATION_CATALOG = [
  {
    name: "Monstera",
    type: "plant",
    image_url: "https://images.unsplash.com/photo-1614594975525-e45190c55d0b?w=200&h=200&fit=crop",
    price: 100,
    description: "Une belle plante verte"
  },
  {
    name: "Bougie rose",
    type: "candle",
    image_url: "https://images.unsplash.com/photo-1602874801006-94c4e4c8e6d4?w=200&h=200&fit=crop",
    price: 50,
    description: "Bougie parfumée rose"
  },
  {
    name: "Mug café",
    type: "mug",
    image_url: "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=200&h=200&fit=crop",
    price: 75,
    description: "Mug cosy pour la lecture"
  },
  {
    name: "Cristal rose",
    type: "crystal",
    image_url: "https://images.unsplash.com/photo-1518180983281-d5c80bd8f471?w=200&h=200&fit=crop",
    price: 150,
    description: "Cristal rose quartz"
  },
  {
    name: "Mini livres",
    type: "book",
    image_url: "https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=200&h=200&fit=crop",
    price: 80,
    description: "Pile de mini livres"
  },
  {
    name: "Guirlande lumineuse",
    type: "light",
    image_url: "https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=200&h=200&fit=crop",
    price: 120,
    description: "Lumières chaleureuses"
  },
  {
    name: "Cactus",
    type: "plant",
    image_url: "https://images.unsplash.com/photo-1509937528035-ad76254b0356?w=200&h=200&fit=crop",
    price: 60,
    description: "Petit cactus mignon"
  },
  {
    name: "Théière",
    type: "mug",
    image_url: "https://images.unsplash.com/photo-1563882050-3b8a7c0fe744?w=200&h=200&fit=crop",
    price: 90,
    description: "Théière vintage"
  }
];

export default function DecorationShop({ open, onOpenChange, user }) {
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState("all");

  const { data: userPoints } = useQuery({
    queryKey: ['userPoints'],
    queryFn: async () => {
      const points = await base44.entities.UserPoints.filter({ created_by: user?.email });
      return points[0] || { total_points: 0, spent_points: 0, available_points: 0 };
    },
    enabled: !!user,
  });

  const { data: ownedDecorations = [] } = useQuery({
    queryKey: ['ownedDecorations'],
    queryFn: () => base44.entities.LibraryDecoration.filter({ 
      created_by: user?.email,
      is_owned: true 
    }),
    enabled: !!user,
  });

  const buyDecorationMutation = useMutation({
    mutationFn: async (decoration) => {
      const availablePoints = (userPoints?.total_points || 0) - (userPoints?.spent_points || 0);
      
      if (availablePoints < decoration.price) {
        throw new Error("Points insuffisants");
      }

      // Create decoration
      await base44.entities.LibraryDecoration.create({
        ...decoration,
        is_owned: true,
        position_x: 50,
        position_y: 50,
        shelf_number: 1,
        rotation: 0,
        scale: 1
      });

      // Update points
      if (userPoints?.id) {
        await base44.entities.UserPoints.update(userPoints.id, {
          spent_points: (userPoints.spent_points || 0) + decoration.price
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ownedDecorations'] });
      queryClient.invalidateQueries({ queryKey: ['userPoints'] });
      toast.success("Décoration achetée ! 🎉");
    },
    onError: (error) => {
      toast.error(error.message || "Erreur lors de l'achat");
    }
  });

  const availablePoints = (userPoints?.total_points || 0) - (userPoints?.spent_points || 0);

  const filteredDecorations = selectedCategory === "all" 
    ? DECORATION_CATALOG 
    : DECORATION_CATALOG.filter(d => d.type === selectedCategory);

  const isOwned = (decoration) => {
    return ownedDecorations.some(d => d.name === decoration.name);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-3" 
                       style={{ color: 'var(--dark-text)' }}>
            <ShoppingBag className="w-7 h-7" style={{ color: 'var(--deep-pink)' }} />
            Boutique de Décorations
          </DialogTitle>
        </DialogHeader>

        {/* Points Balance */}
        <div className="p-4 rounded-xl flex items-center justify-between"
             style={{ background: 'linear-gradient(135deg, var(--soft-pink), var(--warm-pink))' }}>
          <div className="flex items-center gap-3">
            <Coins className="w-8 h-8 text-white" />
            <div>
              <p className="text-white text-sm font-medium">Vos points</p>
              <p className="text-white text-2xl font-bold">{availablePoints}</p>
            </div>
          </div>
          <div className="text-white text-right">
            <p className="text-xs">Total gagné: {userPoints?.total_points || 0}</p>
            <p className="text-xs">Dépensé: {userPoints?.spent_points || 0}</p>
          </div>
        </div>

        {/* Category Filter */}
        <div className="flex gap-2 flex-wrap">
          {["all", "plant", "candle", "mug", "crystal", "light"].map(cat => (
            <Button
              key={cat}
              variant="outline"
              size="sm"
              onClick={() => setSelectedCategory(cat)}
              className={selectedCategory === cat ? "font-bold" : ""}
              style={{
                backgroundColor: selectedCategory === cat ? 'var(--soft-pink)' : 'white',
                color: selectedCategory === cat ? 'white' : 'var(--dark-text)',
                borderColor: 'var(--beige)'
              }}
            >
              {cat === "all" && "Tout"}
              {cat === "plant" && "🌿 Plantes"}
              {cat === "candle" && "🕯️ Bougies"}
              {cat === "mug" && "☕ Mugs"}
              {cat === "crystal" && "💎 Cristaux"}
              {cat === "light" && "✨ Lumières"}
            </Button>
          ))}
        </div>

        {/* Decorations Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredDecorations.map((decoration, idx) => {
            const owned = isOwned(decoration);
            const canAfford = availablePoints >= decoration.price;

            return (
              <div
                key={idx}
                className="p-4 rounded-xl border-2 transition-all hover:shadow-lg"
                style={{
                  backgroundColor: 'white',
                  borderColor: owned ? 'var(--deep-pink)' : 'var(--beige)'
                }}
              >
                {owned && (
                  <div className="absolute top-2 right-2">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center"
                         style={{ backgroundColor: 'var(--deep-pink)' }}>
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  </div>
                )}

                <div className="w-full aspect-square rounded-lg overflow-hidden mb-3"
                     style={{ backgroundColor: 'var(--cream)' }}>
                  <img 
                    src={decoration.image_url} 
                    alt={decoration.name}
                    className="w-full h-full object-cover"
                  />
                </div>

                <h3 className="font-bold text-sm mb-1" style={{ color: 'var(--dark-text)' }}>
                  {decoration.name}
                </h3>
                <p className="text-xs mb-3" style={{ color: 'var(--warm-pink)' }}>
                  {decoration.description}
                </p>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Coins className="w-4 h-4" style={{ color: 'var(--gold)' }} />
                    <span className="font-bold text-sm" style={{ color: 'var(--dark-text)' }}>
                      {decoration.price}
                    </span>
                  </div>

                  {owned ? (
                    <span className="text-xs px-3 py-1 rounded-full font-medium"
                          style={{ backgroundColor: 'var(--cream)', color: 'var(--deep-pink)' }}>
                      Possédé
                    </span>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => buyDecorationMutation.mutate(decoration)}
                      disabled={!canAfford || buyDecorationMutation.isPending}
                      className="text-xs"
                      style={{
                        backgroundColor: canAfford ? 'var(--deep-pink)' : 'var(--beige)',
                        color: 'white'
                      }}
                    >
                      Acheter
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Points Info */}
        <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--cream)' }}>
          <h3 className="font-bold mb-2" style={{ color: 'var(--dark-text)' }}>
            💡 Comment gagner des points ?
          </h3>
          <ul className="text-sm space-y-1" style={{ color: 'var(--warm-pink)' }}>
            <li>• Terminer un livre : +50 points</li>
            <li>• Compléter un défi bingo : +20 points</li>
            <li>• Ajouter un commentaire : +5 points</li>
            <li>• Atteindre votre objectif annuel : +100 points</li>
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
}