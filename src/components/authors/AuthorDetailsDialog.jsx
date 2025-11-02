import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, Star, Calendar, Music } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function AuthorDetailsDialog({ author, open, onOpenChange }) {
  const sortedReadBooks = [...author.readBooks].sort((a, b) => {
    const ratingA = a.userBook.rating || 0;
    const ratingB = b.userBook.rating || 0;
    return ratingB - ratingA;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold"
                 style={{ background: 'linear-gradient(135deg, var(--soft-brown), var(--rose-gold))' }}>
              {author.name[0].toUpperCase()}
            </div>
            <div>
              <DialogTitle className="text-2xl" style={{ color: 'var(--deep-brown)' }}>
                {author.name}
              </DialogTitle>
              <p style={{ color: 'var(--warm-brown)' }}>
                {author.readBooks.length} livre{author.readBooks.length > 1 ? 's' : ''} lu
                {author.readBooks.length > 1 ? 's' : ''}
                {author.averageRating > 0 && (
                  <> • Note moyenne : {author.averageRating.toFixed(1)}/5</>
                )}
              </p>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="read" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="read">
              Livres lus ({author.readBooks.length})
            </TabsTrigger>
            <TabsTrigger value="unread">
              À lire ({author.unreadBooks.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="read" className="space-y-3 py-4">
            {sortedReadBooks.length > 0 ? (
              sortedReadBooks.map((book) => (
                <div key={book.id} 
                     className="flex gap-4 p-4 rounded-xl border-2 transition-all hover:shadow-lg"
                     style={{ 
                       backgroundColor: 'white',
                       borderColor: 'var(--beige)'
                     }}>
                  <div className="w-24 h-36 rounded-lg overflow-hidden shadow-md flex-shrink-0"
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
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="font-bold text-lg mb-1" style={{ color: 'var(--deep-brown)' }}>
                          {book.title}
                        </h3>
                        {book.genre && (
                          <p className="text-sm mb-2" style={{ color: 'var(--warm-brown)' }}>
                            {book.genre}
                          </p>
                        )}
                      </div>
                      {book.userBook.rating && (
                        <div className="flex items-center gap-1 px-3 py-1 rounded-full ml-2"
                             style={{ backgroundColor: 'var(--cream)' }}>
                          <Star className="w-5 h-5 fill-current" style={{ color: 'var(--gold)' }} />
                          <span className="font-bold text-lg" style={{ color: 'var(--deep-brown)' }}>
                            {book.userBook.rating}
                          </span>
                        </div>
                      )}
                    </div>

                    {book.userBook.review && (
                      <p className="text-sm mb-3 line-clamp-2" style={{ color: 'var(--deep-brown)' }}>
                        {book.userBook.review}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-3 text-xs">
                      {book.userBook.end_date && (
                        <div className="flex items-center gap-1 px-2 py-1 rounded-lg"
                             style={{ backgroundColor: 'var(--cream)', color: 'var(--warm-brown)' }}>
                          <Calendar className="w-3 h-3" />
                          Lu le {format(new Date(book.userBook.end_date), 'dd MMM yyyy', { locale: fr })}
                        </div>
                      )}
                      {book.userBook.music && (
                        <div className="flex items-center gap-1 px-2 py-1 rounded-lg"
                             style={{ backgroundColor: 'var(--cream)', color: 'var(--warm-brown)' }}>
                          <Music className="w-3 h-3" />
                          {book.userBook.music}
                        </div>
                      )}
                      {book.userBook.favorite_character && (
                        <div className="px-2 py-1 rounded-lg"
                             style={{ backgroundColor: 'var(--rose-gold)', color: 'var(--deep-brown)' }}>
                          💕 {book.userBook.favorite_character}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12" style={{ color: 'var(--warm-brown)' }}>
                Aucun livre lu de cet auteur
              </div>
            )}
          </TabsContent>

          <TabsContent value="unread" className="space-y-3 py-4">
            {author.unreadBooks.length > 0 ? (
              author.unreadBooks.map((book) => (
                <div key={book.id} 
                     className="flex gap-4 p-4 rounded-xl border-2 transition-all hover:shadow-lg"
                     style={{ 
                       backgroundColor: 'white',
                       borderColor: 'var(--beige)'
                     }}>
                  <div className="w-24 h-36 rounded-lg overflow-hidden shadow-md flex-shrink-0"
                       style={{ backgroundColor: 'var(--beige)' }}>
                    {book.cover_url ? (
                      <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <BookOpen className="w-8 h-8" style={{ color: 'var(--warm-brown)' }} />
                      </div>
                    )}
                  </div>

                  <div className="flex-1">
                    <h3 className="font-bold text-lg mb-1" style={{ color: 'var(--deep-brown)' }}>
                      {book.title}
                    </h3>
                    {book.genre && (
                      <p className="text-sm mb-2" style={{ color: 'var(--warm-brown)' }}>
                        {book.genre}
                      </p>
                    )}
                    <div className="inline-block px-3 py-1 rounded-full text-xs font-medium"
                         style={{ 
                           backgroundColor: book.userBook.status === "Mes envies" 
                             ? 'var(--rose-gold)' 
                             : 'var(--beige)',
                           color: 'var(--deep-brown)'
                         }}>
                      {book.userBook.status}
                    </div>
                    {book.synopsis && (
                      <p className="text-sm mt-3 line-clamp-2" style={{ color: 'var(--warm-brown)' }}>
                        {book.synopsis}
                      </p>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12" style={{ color: 'var(--warm-brown)' }}>
                Aucun livre à lire de cet auteur
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}