import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, Heart, BookOpen, Quote as QuoteIcon, Edit } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function BookBoyfriendCard({ character, book, onEdit }) {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: () => base44.entities.BookBoyfriend.delete(character.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookBoyfriends'] });
      toast.success("Personnage supprimé");
    },
  });

  const rankColors = {
    1: 'var(--gold)',
    2: '#C0C0C0',
    3: '#CD7F32'
  };

  const rankEmojis = {
    1: '🥇',
    2: '🥈',
    3: '🥉'
  };

  return (
    <Card className="shadow-xl border-0 overflow-hidden hover:scale-[1.02] transition-all duration-300 group" 
          style={{ backgroundColor: 'white' }}>
      <CardContent className="p-0">
        <div className="relative">
          {/* Image avec overlay gradient */}
          <div className="relative h-80 md:h-96 overflow-hidden">
            {character.image_url ? (
              <>
                <img 
                  src={character.image_url} 
                  alt={character.character_name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent opacity-80" />
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center"
                   style={{ background: 'linear-gradient(135deg, #FF1493, #FF69B4)' }}>
                <Heart className="w-20 h-20 text-white opacity-50" />
              </div>
            )}
            
            {/* Rank badge */}
            <div className="absolute top-4 right-4 w-16 h-16 rounded-full flex items-center justify-center text-3xl shadow-2xl"
                 style={{ 
                   backgroundColor: rankColors[character.rank] || '#FFB6C8',
                 }}>
              {rankEmojis[character.rank] || `#${character.rank}`}
            </div>

            {/* Nom du personnage en bas */}
            <div className="absolute bottom-0 left-0 right-0 p-6">
              <h3 className="text-3xl md:text-4xl font-bold text-white mb-2 drop-shadow-lg">
                {character.character_name}
              </h3>
              {book && (
                <div className="flex items-center gap-2 text-white text-opacity-90">
                  <BookOpen className="w-4 h-4" />
                  <span className="text-sm md:text-base font-medium">{book.title}</span>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="absolute top-4 left-4 flex gap-2">
              <Button
                size="icon"
                onClick={() => onEdit(character)}
                className="bg-white/90 backdrop-blur-sm hover:bg-white shadow-lg"
              >
                <Edit className="w-4 h-4" style={{ color: '#FF1493' }} />
              </Button>
              <Button
                size="icon"
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
                className="bg-white/90 backdrop-blur-sm hover:bg-white shadow-lg"
              >
                <Trash2 className="w-4 h-4 text-red-500" />
              </Button>
            </div>
          </div>

          {/* Content section */}
          <div className="p-6 space-y-4">
            {character.why_i_love_him && (
              <div className="p-4 rounded-2xl" style={{ background: 'linear-gradient(135deg, #FFF0F6, #FFE4EC)' }}>
                <h4 className="font-bold mb-2 flex items-center gap-2 text-base" 
                    style={{ color: '#FF1493' }}>
                  <Heart className="w-5 h-5" />
                  Pourquoi je l'adore
                </h4>
                <p className="text-sm leading-relaxed" style={{ color: '#2D3748' }}>
                  {character.why_i_love_him}
                </p>
              </div>
            )}

            {character.best_quote && (
              <div className="p-4 rounded-2xl border-2" style={{ borderColor: '#FFE4EC', backgroundColor: 'white' }}>
                <h4 className="font-bold mb-2 flex items-center gap-2 text-sm" 
                    style={{ color: '#FF1493' }}>
                  <QuoteIcon className="w-4 h-4" />
                  Citation préférée
                </h4>
                <p className="text-sm italic leading-relaxed" style={{ color: '#2D3748' }}>
                  "{character.best_quote}"
                </p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}