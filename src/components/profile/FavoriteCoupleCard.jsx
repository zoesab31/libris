import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, Edit, BookOpen } from "lucide-react";

export default function FavoriteCoupleCard({ couple, book, onEdit }) {
  return (
    <Card className="overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 border-2"
          style={{ borderColor: 'var(--beige)', backgroundColor: 'white' }}>
      <CardContent className="p-6">
        <div className="flex gap-6">
          {/* Image */}
          {couple.image_url ? (
            <div className="w-48 h-64 rounded-xl overflow-hidden flex-shrink-0 shadow-lg">
              <img 
                src={couple.image_url} 
                alt={couple.couple_name}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-48 h-64 rounded-xl flex items-center justify-center flex-shrink-0"
                 style={{ background: 'linear-gradient(135deg, var(--soft-pink), var(--lavender))' }}>
              <Heart className="w-16 h-16 text-white" />
            </div>
          )}

          {/* Content */}
          <div className="flex-1 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-3xl font-bold px-3 py-1 rounded-full text-white"
                        style={{ background: 'linear-gradient(135deg, var(--deep-pink), var(--soft-pink))' }}>
                    #{couple.rank}
                  </span>
                </div>
                <h3 className="text-2xl font-bold mb-2" style={{ color: 'var(--dark-text)' }}>
                  {couple.couple_name || `${couple.character1_name} & ${couple.character2_name}`}
                </h3>
                {book && (
                  <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--warm-pink)' }}>
                    <BookOpen className="w-4 h-4" />
                    <span>{book.title}</span>
                  </div>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onEdit(couple)}
                className="hover:bg-pink-50"
              >
                <Edit className="w-5 h-5" style={{ color: 'var(--deep-pink)' }} />
              </Button>
            </div>

            {couple.why_i_love_them && (
              <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--cream)' }}>
                <p className="text-sm font-bold mb-1" style={{ color: 'var(--dark-text)' }}>
                  💕 Pourquoi je les adore
                </p>
                <p className="text-sm" style={{ color: 'var(--dark-text)' }}>
                  {couple.why_i_love_them}
                </p>
              </div>
            )}

            {couple.best_moment && (
              <div className="p-4 rounded-xl" style={{ backgroundColor: '#FFF0F6' }}>
                <p className="text-sm font-bold mb-1" style={{ color: 'var(--dark-text)' }}>
                  ✨ Meilleur moment
                </p>
                <p className="text-sm" style={{ color: 'var(--dark-text)' }}>
                  {couple.best_moment}
                </p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}