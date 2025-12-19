import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, Edit, BookOpen } from "lucide-react";

export default function FavoriteCoupleCard({ couple, book, onEdit }) {
  return (
    <Card className="overflow-hidden shadow-2xl border-0 hover:scale-105 hover:-translate-y-2 transition-all duration-300 group rounded-3xl" 
          style={{ backgroundColor: 'white' }}>
      <CardContent className="p-0">
        {/* Image avec overlay */}
        <div className="relative h-80 md:h-96 overflow-hidden">
          {couple.image_url ? (
            <>
              <img 
                src={couple.image_url} 
                alt={couple.couple_name}
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
          <div className="absolute top-4 right-4 px-4 py-2 rounded-full text-2xl font-bold shadow-2xl"
               style={{ background: 'linear-gradient(135deg, #FFD700, #FFA500)' }}>
            #{couple.rank}
          </div>

          {/* Noms du couple */}
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <h3 className="text-3xl md:text-4xl font-bold text-white mb-1 drop-shadow-lg">
              {couple.couple_name || `${couple.character1_name} & ${couple.character2_name}`}
            </h3>
            {book && (
              <div className="flex items-center gap-2 text-white text-opacity-90">
                <BookOpen className="w-4 h-4" />
                <span className="text-sm md:text-base font-medium">{book.title}</span>
              </div>
            )}
          </div>

          {/* Edit button */}
          <Button
            size="icon"
            onClick={() => onEdit(couple)}
            className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm hover:bg-white shadow-lg"
          >
            <Edit className="w-4 h-4" style={{ color: '#FF1493' }} />
          </Button>
        </div>

        {/* Content section */}
        <div className="p-6 space-y-4">
          {couple.why_i_love_them && (
            <div className="p-4 rounded-2xl" style={{ background: 'linear-gradient(135deg, #FFF0F6, #FFE4EC)' }}>
              <h4 className="font-bold mb-2 flex items-center gap-2 text-base" 
                  style={{ color: '#FF1493' }}>
                <Heart className="w-5 h-5" />
                Pourquoi je les adore
              </h4>
              <p className="text-sm leading-relaxed" style={{ color: '#2D3748' }}>
                {couple.why_i_love_them}
              </p>
            </div>
          )}

          {couple.best_moment && (
            <div className="p-4 rounded-2xl border-2" style={{ borderColor: '#FFE4EC', backgroundColor: 'white' }}>
              <h4 className="font-bold mb-2 flex items-center gap-2 text-sm" 
                  style={{ color: '#FF1493' }}>
                ✨ Meilleur moment
              </h4>
              <p className="text-sm leading-relaxed" style={{ color: '#2D3748' }}>
                {couple.best_moment}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}