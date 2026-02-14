import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, BookOpen, Users } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function SharedReadingCard({ reading, book, onClick }) {
  const statusColors = {
    "En cours": "var(--gold)",
    "À venir": "var(--soft-pink)",
    "Terminée": "var(--beige)"
  };

  return (
    <Card 
      className="shadow-lg border-0 overflow-hidden hover:shadow-xl transition-all cursor-pointer"
      style={{ backgroundColor: 'white' }}
      onClick={onClick}
    >
      <div className="h-2" style={{ backgroundColor: statusColors[reading.status] }} />
      <CardContent className="p-6">
        <div className="flex gap-4">
          <div className="w-20 h-28 rounded-lg overflow-hidden shadow-md flex-shrink-0"
               style={{ backgroundColor: 'var(--beige)' }}>
            {book?.cover_url ? (
              <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <BookOpen className="w-8 h-8" style={{ color: 'var(--warm-pink)' }} />
              </div>
            )}
          </div>

          <div className="flex-1">
            <h3 className="font-bold text-lg mb-2" style={{ color: 'var(--dark-text)' }}>
              {book?.title || reading.title}
            </h3>
            
            {book && (
              <p className="text-sm mb-3" style={{ color: 'var(--warm-pink)' }}>
                {book.author}
              </p>
            )}

            <div className="space-y-2 text-sm">
              {reading.start_date && (
                <div className="flex items-center gap-2" style={{ color: 'var(--warm-pink)' }}>
                  <Calendar className="w-4 h-4" />
                  <span>
                    {format(new Date(reading.start_date), 'dd MMM', { locale: fr })}
                    {reading.end_date && ` - ${format(new Date(reading.end_date), 'dd MMM yyyy', { locale: fr })}`}
                  </span>
                </div>
              )}

              {reading.chapters_per_day && (
                <div className="flex items-center gap-2" style={{ color: 'var(--warm-pink)' }}>
                  <BookOpen className="w-4 h-4" />
                  <span>{reading.chapters_per_day} chapitre{reading.chapters_per_day > 1 ? 's' : ''} / jour</span>
                </div>
              )}

              <div className="pt-2">
                <span className="px-3 py-1 rounded-full text-xs font-medium"
                      style={{ 
                        backgroundColor: statusColors[reading.status],
                        color: 'white'
                      }}>
                  {reading.status}
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}