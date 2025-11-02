import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Calendar } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function CurrentlyReading({ books, allBooks, isLoading }) {
  if (isLoading) {
    return (
      <Card className="shadow-lg border-0" style={{ backgroundColor: 'white' }}>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg border-0 overflow-hidden" style={{ backgroundColor: 'white' }}>
      <div className="h-2" style={{ background: 'linear-gradient(90deg, var(--warm-brown), var(--soft-brown))' }} />
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl" style={{ color: 'var(--deep-brown)' }}>
          <BookOpen className="w-6 h-6" />
          En cours de lecture
        </CardTitle>
      </CardHeader>
      <CardContent>
        {books.length > 0 ? (
          <div className="grid md:grid-cols-2 gap-4">
            {books.map((userBook) => {
              const book = allBooks.find(b => b.id === userBook.book_id);
              if (!book) return null;
              
              return (
                <div key={userBook.id} 
                     className="flex gap-4 p-4 rounded-xl transition-all hover:shadow-md"
                     style={{ backgroundColor: 'var(--cream)' }}>
                  <div className="w-20 h-28 rounded-lg overflow-hidden flex-shrink-0 shadow-md"
                       style={{ backgroundColor: 'var(--beige)' }}>
                    {book.cover_url ? (
                      <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <BookOpen className="w-8 h-8" style={{ color: 'var(--warm-brown)' }} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold mb-1 line-clamp-2" style={{ color: 'var(--deep-brown)' }}>
                      {book.title}
                    </h3>
                    <p className="text-sm mb-2" style={{ color: 'var(--warm-brown)' }}>
                      {book.author}
                    </p>
                    {userBook.start_date && (
                      <p className="text-xs flex items-center gap-1" style={{ color: 'var(--soft-brown)' }}>
                        <Calendar className="w-3 h-3" />
                        Début : {format(new Date(userBook.start_date), 'dd MMM yyyy', { locale: fr })}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-20" style={{ color: 'var(--warm-brown)' }} />
            <p className="text-lg" style={{ color: 'var(--warm-brown)' }}>
              Aucune lecture en cours
            </p>
            <p className="text-sm mt-2" style={{ color: 'var(--soft-brown)' }}>
              Commencez un nouveau livre pour le voir ici
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}