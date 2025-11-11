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
    <Card className="shadow-lg border-0 overflow-hidden hover:shadow-xl transition-all" 
          style={{ backgroundColor: 'white' }}>
      <CardContent className="p-0">
        <div className="flex flex-col md:flex-row">
          {/* Image section */}
          <div className="relative md:w-1/3">
            <div className="aspect-[3/4] md:h-full">
              {character.image_url ? (
                <img 
                  src={character.image_url} 
                  alt={character.character_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center"
                     style={{ backgroundColor: 'var(--beige)' }}>
                  <Heart className="w-16 h-16" style={{ color: 'var(--warm-brown)' }} />
                </div>
              )}
            </div>
            {/* Rank badge */}
            <div className="absolute top-4 left-4 w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold shadow-lg"
                 style={{ 
                   backgroundColor: rankColors[character.rank] || 'var(--soft-brown)',
                   color: 'white'
                 }}>
              {rankEmojis[character.rank] || `#${character.rank}`}
            </div>
          </div>

          {/* Content section */}
          <div className="flex-1 p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-2xl font-bold mb-2" style={{ color: 'var(--deep-brown)' }}>
                  {character.character_name}
                </h3>
                {book && (
                  <div className="flex items-center gap-2 text-sm mb-3" style={{ color: 'var(--warm-brown)' }}>
                    <BookOpen className="w-4 h-4" />
                    <span>{book.title} - {book.author}</span>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onEdit(character)}
                >
                  <Edit className="w-4 h-4" style={{ color: 'var(--deep-pink)' }} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteMutation.mutate()}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              </div>
            </div>

            {character.why_i_love_him && (
              <div className="mb-4">
                <h4 className="font-semibold mb-2 flex items-center gap-2" 
                    style={{ color: 'var(--deep-brown)' }}>
                  <Heart className="w-4 h-4" style={{ color: 'var(--rose-gold)' }} />
                  Pourquoi je l'adore
                </h4>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--warm-brown)' }}>
                  {character.why_i_love_him}
                </p>
              </div>
            )}

            {character.best_quote && (
              <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--cream)' }}>
                <h4 className="font-semibold mb-2 flex items-center gap-2 text-sm" 
                    style={{ color: 'var(--deep-brown)' }}>
                  <QuoteIcon className="w-4 h-4" />
                  Citation préférée
                </h4>
                <p className="text-sm italic leading-relaxed" style={{ color: 'var(--deep-brown)' }}>
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